using DsatPsatLmsApi.DTOs;

namespace DsatPsatLmsApi.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(string token, string newPassword);
    Task LogoutAsync(Guid userId, string token);
}