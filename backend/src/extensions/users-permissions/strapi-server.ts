import authController from './controllers/auth';

export default (plugin) => {
  // Override the auth controller with custom forgot password functionality
  plugin = authController(plugin);

  // Add custom updateProfile method (inline to avoid replacing default user controller)
  plugin.controllers.user.updateProfile = async (ctx) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest('User not found');
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
  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/user/profile',
    handler: 'user.updateProfile',
    config: {
      prefix: '',
      policies: [],
    },
  });

  return plugin;
};
