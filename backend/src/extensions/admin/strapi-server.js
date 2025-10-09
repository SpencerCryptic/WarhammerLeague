const { customEmailService } = require('../../services/email');

module.exports = (plugin) => {
  // Override the admin auth controller's forgotPassword method
  plugin.controllers.authentication.forgotPassword = async (ctx) => {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('email.required');
    }

    const user = await strapi.query('admin::user').findOne({ where: { email: email.toLowerCase() } });

    if (!user || !user.isActive) {
      // Return success even if user doesn't exist to prevent email enumeration
      return ctx.send({ ok: true });
    }

    // Generate reset password token
    const resetPasswordToken = await strapi.service('admin::token').createToken(user, 'resetPassword');

    // Build reset URL
    const resetPasswordUrl = `${strapi.config.get('admin.url') || strapi.config.get('server.url')}/admin/auth/reset-password?code=${resetPasswordToken}`;

    try {
      // Send email using custom email service
      await customEmailService.sendPasswordResetEmail(user.email, resetPasswordUrl);
    } catch (err) {
      console.error('Error sending admin password reset email:', err);
      return ctx.badRequest('email.send.error');
    }

    return ctx.send({ ok: true });
  };

  return plugin;
};
