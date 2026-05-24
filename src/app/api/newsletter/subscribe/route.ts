import { execute, query } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Check if already subscribed
    const existing = await query("SELECT id, active FROM newsletter_subscribers WHERE email = ?", [email]);

    let isNewSubscription = false;

    if (existing.length > 0) {
      const sub = existing[0] as { id: number; active: number };
      if (sub.active) {
        return NextResponse.json({ message: "Already subscribed" });
      }
      // Re-activate
      await execute("UPDATE newsletter_subscribers SET active = 1, name = ? WHERE id = ?", [name || null, sub.id]);
      isNewSubscription = true; // Treating reactivation as a new subscription for notification purposes
    } else {
      await execute(
        "INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)",
        [email, name || null]
      );
      isNewSubscription = true;
    }

    if (isNewSubscription) {
      try {
        // 1. Send "Thank You" email to the subscriber
        await sendEmail({
          to: email,
          subject: "Welcome to the Johnnybits Newsletter!",
          text: `Hi ${name || 'there'},\n\nThank you for subscribing to our newsletter! We're excited to have you on board.\n\nBest regards,\nThe Johnnybits Team`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
              <h2>Welcome to the Johnnybits Newsletter!</h2>
              <p>Hi ${name || 'there'},</p>
              <p>Thank you for subscribing to our newsletter! We're excited to have you on board. You'll be the first to know about our latest insights, updates, and digital solutions.</p>
              <br/>
              <p>Best regards,<br/><strong>The Johnnybits Team</strong></p>
            </div>
          `,
        });

        // 2. Send notification to the Admin
        await sendEmail({
          // 'to' is omitted, so it defaults to the admin email configured in settings
          subject: "New Newsletter Subscriber!",
          text: `A new user has subscribed to the newsletter:\n\nEmail: ${email}\nName: ${name || 'N/A'}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
              <h3>New Newsletter Subscriber! 🎉</h3>
              <p>A new user has just subscribed to the newsletter.</p>
              <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Name:</strong> ${name || 'N/A'}</li>
              </ul>
            </div>
          `,
        });
      } catch (emailError) {
        // We log the error but don't fail the subscription process
        console.error("Failed to send newsletter subscription emails:", emailError);
      }
    }

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 201 });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
