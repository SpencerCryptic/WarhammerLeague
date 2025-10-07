import { factories } from '@strapi/strapi';
import { customEmailService } from '../../../services/email';

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
          expiresAt: expiresAt.toISOString(),
          sentToEmail: email
        }
      });

      // Create league invitation link
      const leagueLink = `${process.env.FRONTEND_URL || 'https://warhammerleague.vercel.app'}/leagues/${leagueId}`;

      // Send email using custom email service
      const emailSent = await customEmailService.sendOTPEmail(email, code, leagueName);

      if (!emailSent) {
        return ctx.badRequest('Failed to send OTP email');
      }

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