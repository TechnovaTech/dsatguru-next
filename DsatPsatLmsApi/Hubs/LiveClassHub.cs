using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DsatPsatLmsApi.Hubs;

[Authorize]
public class LiveClassHub : Hub
{
    private readonly AppDbContext _context;
    private readonly ILogger<LiveClassHub> _logger;

    public LiveClassHub(AppDbContext context, ILogger<LiveClassHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task JoinClass(string classId)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                await Clients.Caller.SendAsync("Error", "Invalid user authentication");
                return;
            }

            if (!Guid.TryParse(classId, out var classGuid))
            {
                await Clients.Caller.SendAsync("Error", "Invalid class ID");
                return;
            }

            // Verify user is enrolled in the class
            var enrollment = await _context.ClassEnrollments
                .FirstOrDefaultAsync(e => e.ClassId == classGuid && e.StudentId == userGuid);

            if (enrollment == null)
            {
                await Clients.Caller.SendAsync("Error", "You are not enrolled in this class");
                return;
            }

            // Join the SignalR group for this class
            await Groups.AddToGroupAsync(Context.ConnectionId, $"class_{classId}");

            // Record attendance
            var attendance = await _context.ClassAttendances
                .FirstOrDefaultAsync(a => a.ClassId == classGuid && a.StudentId == userGuid);

            if (attendance == null)
            {
                attendance = new ClassAttendance
                {
                    ClassId = classGuid,
                    StudentId = userGuid,
                    JoinedAt = DateTime.UtcNow,
                    IsPresent = true,
                    Status = AttendanceStatus.Present
                };
                _context.ClassAttendances.Add(attendance);
            }
            else
            {
                attendance.JoinedAt = DateTime.UtcNow;
                attendance.IsPresent = true;
                attendance.Status = AttendanceStatus.Present;
            }

            await _context.SaveChangesAsync();

            // Get user info
            var user = await _context.Users.FindAsync(userGuid);
            
            // Notify others in the class
            await Clients.Group($"class_{classId}").SendAsync("UserJoined", new
            {
                UserId = userId,
                UserName = user?.Name ?? "Unknown",
                JoinedAt = DateTime.UtcNow
            });

            // Send current class info to the user
            var liveClass = await _context.EnhancedLiveClasses
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Sender)
                .Include(c => c.Attendances)
                    .ThenInclude(a => a.Student)
                .FirstOrDefaultAsync(c => c.Id == classGuid);

            if (liveClass != null)
            {
                await Clients.Caller.SendAsync("ClassInfo", new
                {
                    ClassId = liveClass.Id,
                    Title = liveClass.Title,
                    Status = liveClass.Status.ToString(),
                    AttendeeCount = liveClass.Attendances.Count(a => a.IsPresent),
                    RecentMessages = liveClass.Messages
                        .OrderByDescending(m => m.SentAt)
                        .Take(50)
                        .Select(m => new
                        {
                            Id = m.Id,
                            SenderName = m.Sender.Name,
                            Message = m.Message,
                            Type = m.Type.ToString(),
                            IsQuestion = m.IsQuestion,
                            IsAnswered = m.IsAnswered,
                            SentAt = m.SentAt
                        })
                        .Reverse()
                });
            }

            _logger.LogInformation($"User {userId} joined class {classId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error joining class {classId}");
            await Clients.Caller.SendAsync("Error", "Failed to join class");
        }
    }

    public async Task LeaveClass(string classId)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                return;

            if (!Guid.TryParse(classId, out var classGuid))
                return;

            // Update attendance
            var attendance = await _context.ClassAttendances
                .FirstOrDefaultAsync(a => a.ClassId == classGuid && a.StudentId == userGuid);

            if (attendance != null)
            {
                attendance.LeftAt = DateTime.UtcNow;
                attendance.IsPresent = false;
                
                if (attendance.JoinedAt.HasValue)
                {
                    var duration = (DateTime.UtcNow - attendance.JoinedAt.Value).TotalMinutes;
                    attendance.TotalMinutesAttended += (int)duration;
                }

                await _context.SaveChangesAsync();
            }

            // Leave the SignalR group
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"class_{classId}");

            // Get user info
            var user = await _context.Users.FindAsync(userGuid);

            // Notify others in the class
            await Clients.Group($"class_{classId}").SendAsync("UserLeft", new
            {
                UserId = userId,
                UserName = user?.Name ?? "Unknown",
                LeftAt = DateTime.UtcNow
            });

            _logger.LogInformation($"User {userId} left class {classId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error leaving class {classId}");
        }
    }

    public async Task SendMessage(string classId, string message, bool isQuestion = false)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                await Clients.Caller.SendAsync("Error", "Invalid user authentication");
                return;
            }

            if (!Guid.TryParse(classId, out var classGuid))
            {
                await Clients.Caller.SendAsync("Error", "Invalid class ID");
                return;
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                await Clients.Caller.SendAsync("Error", "Message cannot be empty");
                return;
            }

            // Verify user is in the class
            var enrollment = await _context.ClassEnrollments
                .FirstOrDefaultAsync(e => e.ClassId == classGuid && e.StudentId == userGuid);

            if (enrollment == null)
            {
                await Clients.Caller.SendAsync("Error", "You are not enrolled in this class");
                return;
            }

            // Create and save the message
            var classMessage = new ClassMessage
            {
                ClassId = classGuid,
                SenderId = userGuid,
                Message = message.Trim(),
                Type = isQuestion ? MessageType.Question : MessageType.Chat,
                IsQuestion = isQuestion,
                IsAnswered = false,
                SentAt = DateTime.UtcNow
            };

            _context.ClassMessages.Add(classMessage);
            await _context.SaveChangesAsync();

            // Get user info
            var user = await _context.Users.FindAsync(userGuid);

            // Broadcast message to all users in the class
            await Clients.Group($"class_{classId}").SendAsync("NewMessage", new
            {
                Id = classMessage.Id,
                SenderName = user?.Name ?? "Unknown",
                SenderId = userId,
                Message = classMessage.Message,
                Type = classMessage.Type.ToString(),
                IsQuestion = classMessage.IsQuestion,
                IsAnswered = classMessage.IsAnswered,
                SentAt = classMessage.SentAt
            });

            _logger.LogInformation($"User {userId} sent message in class {classId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending message in class {classId}");
            await Clients.Caller.SendAsync("Error", "Failed to send message");
        }
    }

    public async Task AnswerQuestion(string classId, string messageId)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                return;

            if (!Guid.TryParse(classId, out var classGuid) || !Guid.TryParse(messageId, out var msgGuid))
                return;

            // Verify user is instructor or admin
            var user = await _context.Users.FindAsync(userGuid);
            if (user?.Role != UserRole.Admin && user?.Role != UserRole.Tutor)
            {
                await Clients.Caller.SendAsync("Error", "Only instructors can answer questions");
                return;
            }

            // Update the message
            var message = await _context.ClassMessages
                .FirstOrDefaultAsync(m => m.Id == msgGuid && m.ClassId == classGuid);

            if (message != null && message.IsQuestion)
            {
                message.IsAnswered = true;
                await _context.SaveChangesAsync();

                // Notify all users in the class
                await Clients.Group($"class_{classId}").SendAsync("QuestionAnswered", new
                {
                    MessageId = messageId,
                    AnsweredBy = user?.Name ?? "Instructor",
                    AnsweredAt = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error answering question in class {classId}");
        }
    }

    public async Task SendAnnouncement(string classId, string announcement)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                return;

            // Verify user is instructor or admin
            var user = await _context.Users.FindAsync(userGuid);
            if (user?.Role != UserRole.Admin && user?.Role != UserRole.Tutor)
            {
                await Clients.Caller.SendAsync("Error", "Only instructors can send announcements");
                return;
            }

            if (!Guid.TryParse(classId, out var classGuid))
                return;

            // Create and save the announcement
            var classMessage = new ClassMessage
            {
                ClassId = classGuid,
                SenderId = userGuid,
                Message = announcement.Trim(),
                Type = MessageType.Announcement,
                IsQuestion = false,
                IsAnswered = false,
                SentAt = DateTime.UtcNow
            };

            _context.ClassMessages.Add(classMessage);
            await _context.SaveChangesAsync();

            // Broadcast announcement to all users in the class
            await Clients.Group($"class_{classId}").SendAsync("Announcement", new
            {
                Id = classMessage.Id,
                SenderName = user?.Name ?? "Instructor",
                Message = classMessage.Message,
                SentAt = classMessage.SentAt
            });

            _logger.LogInformation($"Instructor {userId} sent announcement in class {classId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending announcement in class {classId}");
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
            {
                // Update all active attendances for this user
                var activeAttendances = await _context.ClassAttendances
                    .Where(a => a.StudentId == userGuid && a.IsPresent)
                    .ToListAsync();

                foreach (var attendance in activeAttendances)
                {
                    attendance.LeftAt = DateTime.UtcNow;
                    attendance.IsPresent = false;
                    
                    if (attendance.JoinedAt.HasValue)
                    {
                        var duration = (DateTime.UtcNow - attendance.JoinedAt.Value).TotalMinutes;
                        attendance.TotalMinutesAttended += (int)duration;
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"User {userId} disconnected and attendance updated");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling user disconnection");
        }

        await base.OnDisconnectedAsync(exception);
    }
}