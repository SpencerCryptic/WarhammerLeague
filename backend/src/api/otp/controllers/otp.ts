import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::otp.otp', ({ strapi }) => ({
  
  async generateOTPs(ctx) {
    const { leagueId, count = 10 } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!leagueId) {
      return ctx.badRequest('League ID is required');
    }

    try {
      // Check if user is admin of the league
      const league = await strapi.documents('api::league.league').findOne({
        documentId: leagueId,
        populate: {
          createdByUser: { fields: ['id'] }
        }
      });

      if (!league || league.createdByUser?.id !== userId) {
        return ctx.unauthorized('Only the league admin can generate OTPs');
      }

      // Generate OTPs
      const otps = [];
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3); // Expire in 3 months

      for (let i = 0; i < count; i++) {
        const code = generateOTPCode();
        const otp = await strapi.documents('api::otp.otp').create({
          data: {
            code,
            league: leagueId,
            isUsed: false,
            expiresAt: expiresAt.toISOString()
          }
        });
        otps.push(otp);
      }

      ctx.body = {
        data: otps,
        message: `Generated ${count} OTPs for league`
      };

    } catch (error) {
      console.error('Error generating OTPs:', error);
      return ctx.badRequest(`Failed to generate OTPs: ${error.message}`);
    }
  },

  async getLeagueOTPs(ctx) {
    const { leagueId } = ctx.params;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    try {
      // Check if user is admin of the league
      const league = await strapi.documents('api::league.league').findOne({
        documentId: leagueId,
        populate: {
          createdByUser: { fields: ['id'] }
        }
      });

      if (!league || league.createdByUser?.id !== userId) {
        return ctx.unauthorized('Only the league admin can view OTPs');
      }

      // Get all OTPs for this league
      const otps = await strapi.documents('api::otp.otp').findMany({
        filters: { league: { documentId: leagueId } },
        populate: {
          usedBy: { fields: ['username', 'email'] }
        },
        sort: ['createdAt:desc']
      });

      ctx.body = { data: otps };

    } catch (error) {
      console.error('Error fetching league OTPs:', error);
      return ctx.badRequest(`Failed to fetch OTPs: ${error.message}`);
    }
  },

  async verifyOTP(ctx) {
    const { code, leagueId } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!code || !leagueId) {
      return ctx.badRequest('OTP code and league ID are required');
    }

    try {
      // Find the OTP
      const [otp] = await strapi.documents('api::otp.otp').findMany({
        filters: {
          $and: [
            { code },
            { league: { documentId: leagueId } },
            { isUsed: false }
          ]
        }
      });

      if (!otp) {
        return ctx.badRequest('Invalid or already used OTP');
      }

      // Check if expired
      if (new Date() > new Date(otp.expiresAt)) {
        return ctx.badRequest('OTP has expired');
      }

      // Mark OTP as used
      await strapi.documents('api::otp.otp').update({
        documentId: otp.documentId,
        data: {
          isUsed: true,
          usedBy: userId,
          usedAt: new Date().toISOString()
        }
      });

      ctx.body = {
        data: { valid: true },
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      return ctx.badRequest(`Failed to verify OTP: ${error.message}`);
    }
  },

  async sendEmail(ctx) {
    const { email, leagueId, leagueName } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!email || !leagueId || !leagueName) {
      return ctx.badRequest('Email, league ID, and league name are required');
    }

    try {
      // Check if user is admin of the league
      const league = await strapi.documents('api::league.league').findOne({
        documentId: leagueId,
        populate: {
          createdByUser: { fields: ['id'] }
        }
      });

      if (!league || league.createdByUser?.id !== userId) {
        return ctx.unauthorized('Only the league admin can send OTP emails');
      }

      // Generate a new OTP
      const code = generateOTPCode();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3); // Expire in 3 months

      const otp = await strapi.documents('api::otp.otp').create({
        data: {
          code,
          league: leagueId,
          isUsed: false,
          expiresAt: expiresAt.toISOString()
        }
      });

      // Create league invitation link
      const leagueLink = `${process.env.FRONTEND_URL || 'https://warhammerleague.vercel.app'}/leagues/${leagueId}`;

      // Send email using Strapi's email plugin
      await strapi.plugin('email').service('email').send({
        to: email,
        subject: `Invitation to join ${leagueName} - Warhammer League`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">You're invited to join ${leagueName}!</h2>
            
            <p>Hello,</p>
            
            <p>You've been invited to join the <strong>${leagueName}</strong> in the Warhammer League platform.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Your access code:</h3>
              <div style="font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #059669; background-color: white; padding: 15px; border-radius: 4px; text-align: center;">
                ${code}
              </div>
            </div>
            
            <p><strong>How to join:</strong></p>
            <ol>
              <li>Click the link below to visit the league</li>
              <li>Create an account or log in if you already have one</li>
              <li>Use the access code above to join the league</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${leagueLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Join ${leagueName}
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This access code expires in 3 months. If you have any questions, please contact the league administrator.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Sent from Warhammer League Platform
            </p>
          </div>
        `
      });

      ctx.body = {
        data: { 
          otpId: otp.documentId,
          code: otp.code,
          emailSent: true 
        },
        message: `OTP sent successfully to ${email}`
      };

    } catch (error) {
      console.error('Error sending OTP email:', error);
      return ctx.badRequest(`Failed to send OTP email: ${error.message}`);
    }
  }

}));

// Helper function to generate random OTP codes
function generateOTPCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}