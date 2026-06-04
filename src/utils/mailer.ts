import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export interface SellerOnboardDetails {
    sellerName: string;
    storeName: string;
    email: string;
    phone: string;
    address: string;
}

export const sendSellerOnboardEmail = async (details: SellerOnboardDetails) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_FROM,
                pass: process.env.SMTP_PASS, // User must provide this in .env
            },
        });

        const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';
        const adminEmails = process.env.ADMIN_EMAILS || 'Sharmaankit7860@gmail.com, ranjitkumarbgs61@gmail.com';

        const info = await transporter.sendMail({
            from: `"Drapeit Admin" <${fromEmail}>`,
            to: adminEmails,
            subject: "New Seller Onboarded to Drapeit",
            text: `A new seller has just onboarded successfully to Drapeit.\n\nDetails:\nSeller Name: ${details.sellerName}\nStore Name: ${details.storeName}\nEmail: ${details.email || 'N/A'}\nPhone: ${details.phone || 'N/A'}\nAddress: ${details.address || 'N/A'}\n\nPlease review their details in the admin panel.`,
            html: `<p>A new seller has just onboarded successfully to Drapeit.</p>
            <ul>
                <li><strong>Seller Name:</strong> ${details.sellerName}</li>
                <li><strong>Store Name:</strong> ${details.storeName}</li>
                <li><strong>Email:</strong> ${details.email || 'N/A'}</li>
                <li><strong>Phone:</strong> ${details.phone || 'N/A'}</li>
                <li><strong>Address:</strong> ${details.address || 'N/A'}</li>
            </ul>
            <p>Please review their details in the admin panel.</p>`,
        });

        console.log("Seller onboard email sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending seller onboard email:", error);
    }
};
