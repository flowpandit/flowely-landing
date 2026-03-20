/**
 * Cloudflare Pages Function — handles "Notify Me" form submissions.
 * Sends a confirmation email to the subscriber and a notification to the admin.
 *
 * Environment variable (set as secret in Cloudflare dashboard):
 *   RESEND_API_KEY — your Resend API key
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address." }), { status: 400, headers });
    }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Service not configured." }), { status: 500, headers });
    }

    // Send confirmation email to the subscriber
    const confirmRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Flowely <no-reply@flowely.com.au>",
        to: [email],
        subject: "You're on the Flowely launch list!",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #158F77; margin-bottom: 16px;">Thanks for your interest in Flowely!</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.7;">
              You've been added to our launch notification list. We'll email you as soon as Flowely is available for download.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.7;">
              Flowely is an NDIS invoice compliance checker built for Australian providers — check support item codes, price caps, GST, manage participants, track budgets, and generate compliant invoices. All offline, all private.
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
              — The Flowely Team<br/>
              <a href="https://flowely.com.au" style="color: #158F77;">flowely.com.au</a>
            </p>
          </div>
        `,
      }),
    });

    // Send notification to admin
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Flowely Notifications <no-reply@flowely.com.au>",
        to: ["contact@flowely.com.au"],
        subject: `New launch signup: ${email}`,
        html: `<p>New email signup for Flowely launch list:</p><p><strong>${email}</strong></p><p>Time: ${new Date().toISOString()}</p>`,
      }),
    });

    if (!confirmRes.ok) {
      const err = await confirmRes.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Failed to send confirmation email." }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    console.error("Notify error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), { status: 500, headers });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
