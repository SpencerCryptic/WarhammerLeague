import authController from './controllers/auth';

export default (plugin) => {
  // Override the auth controller with custom forgot password functionality
  plugin = authController(plugin);

  // Add custom updateProfile method (inline to avoid replacing default user controller)
  plugin.controllers.user.updateProfile = async (ctx) => {
    // With auth: false, we need to manually verify JWT and get user
    let user = ctx.state.user;

    if (!user) {
      // Try to get user from JWT manually
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('No authorization token provided');
      }

      const token = authHeader.substring(7);
      try {
        const jwtService = strapi.plugin('users-permissions').service('jwt');
        const payload = await jwtService.verify(token);
        user = await strapi.entityService.findOne('plugin::users-permissions.user', payload.id);

        if (!user) {
          return ctx.unauthorized('Invalid token - user not found');
        }
      } catch (error) {
        return ctx.unauthorized('Invalid or expired token');
      }
    }

    const { email, firstName, lastName, phoneNumber, dateOfBirth, storeLocation } = ctx.request.body;

    // Build update data, only including fields that are provided
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (storeLocation !== undefined) updateData.storeLocation = storeLocation;

    try {
      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: updateData,
      });

      // Fetch fresh user data to return
      const freshUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id);

      // Remove sensitive fields if they exist
      if (freshUser) {
        delete (freshUser as any).password;
        delete (freshUser as any).resetPasswordToken;
        delete (freshUser as any).confirmationToken;
      }

      return ctx.send(freshUser);
    } catch (error) {
      console.error('Profile update error:', error);
      return ctx.badRequest('Failed to update profile');
    }
  };

  // Add custom route for profile update
  // auth: false bypasses role permissions, but JWT is still parsed and ctx.state.user populated
  // Controller handles auth check manually via ctx.state.user
  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/user/profile',
    handler: 'user.updateProfile',
    config: {
      prefix: '',
      policies: [],
      auth: false,
    },
  });

  return plugin;
};
