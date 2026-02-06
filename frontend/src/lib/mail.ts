import nodemailer from 'nodemailer';

const getTransporter = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    // Fallback for development/testing without real credentials
    return null;
};

export async function sendEmail({
    to,
    subject,
    text,
    html,
}: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) {
    const transporter = getTransporter();

    if (!transporter) {
        console.log("⚠️ Email Service Not Configured. Mocking email send:");
        console.log(`To: ${to}\nSubject: ${subject}\nBody: ${text}`);
        return { success: true, mocked: true };
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"StoryNest" <noreply@storynest.com>',
            to,
            subject,
            text,
            html: html || text,
        });
        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
}
