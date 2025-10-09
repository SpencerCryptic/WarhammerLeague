import { customEmailService } from '../../../services/email';
import utils from '@strapi/utils';

const { sanitize } = utils;
const { ApplicationError, ValidationError } = utils.errors;

export default (plugin) => {
  const getService = (name) => {
    return strapi.plugin('users-permissions').service(name);
  };

  plugin.controllers.auth.forgotPassword = async (ctx) => {
    let { email } = ctx.request.body;

    if (!email) {
      throw new ValidationError('Please provide your email');
    }

    // Sanitize the email
    email = email.toLowerCase();

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
    const advanced = await pluginStore.get({ key: 'advanced' });

    // Find the user by email
    const user = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    if (!user || user.blocked) {
      // Return success even if user doesn't exist to prevent email enumeration
      return ctx.send({ ok: true });
    }

    // Generate reset password token
    const userService = getService('user');
    const resetPasswordToken = await userService.createResetPasswordToken(user.id);

    // Build reset URL
    const resetPasswordUrl = `${process.env.FRONTEND_URL || 'https://leagues.crypticcabin.com'}/auth/reset-password?code=${resetPasswordToken}`;

    try {
      // Send email using custom email service
      await customEmailService.sendPasswordResetEmail(user.email, resetPasswordUrl);
    } catch (err) {
      console.error('Error sending password reset email:', err);
      throw new ApplicationError('Error sending email');
    }

    ctx.send({ ok: true });
  };

  return plugin;
};
