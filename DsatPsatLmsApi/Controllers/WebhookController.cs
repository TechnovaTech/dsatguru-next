using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.Services;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhookController : ControllerBase
{
    private readonly IWebhookService _webhookService;

    public WebhookController(IWebhookService webhookService)
    {
        _webhookService = webhookService;
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> StripeWebhook()
    {
        await _webhookService.HandleStripeWebhookAsync(Request);
        return Ok();
    }
}