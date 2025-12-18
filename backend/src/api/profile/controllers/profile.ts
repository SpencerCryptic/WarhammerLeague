export default {
  // Full profile update during registration (all fields allowed)
  async update(ctx) {
    const authenticatedUserId = ctx.state.user?.id;
    const { userId, firstName, lastName, phoneNumber, dateOfBirth, storeLocation } = ctx.request.body;

    if (!userId) {
      return ctx.badRequest('User ID is required');
    }

    // Security: Ensure user can only update their own profile
    // Use loose equality to handle string/number type differences
    if (!authenticatedUserId || String(userId) !== String(authenticatedUserId)) {
      return ctx.forbidden('You can only update your own profile');
    }

    try {
      const updatedUser = await strapi.entityService.update(
        'plugin::users-permissions.user',
        userId,
        {
          data: {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            storeLocation,
          },
        }
      );

      return ctx.send({ user: updatedUser });
    } catch (error) {
      console.error('Profile update error:', error);
      return ctx.badRequest('Failed to update profile');
    }
  },

  // Limited profile update after registration (only certain fields allowed)
  async updateLimited(ctx) {
    const authenticatedUserId = ctx.state.user?.id;
    const { userId, email, phoneNumber, storeLocation } = ctx.request.body;

    if (!userId) {
      return ctx.badRequest('User ID is required');
    }

    // Security: Ensure user can only update their own profile
    // Use loose equality to handle string/number type differences
    if (!authenticatedUserId || String(userId) !== String(authenticatedUserId)) {
      return ctx.forbidden('You can only update your own profile');
    }

    // Only allow updating specific fields after registration
    const allowedFields: any = {};
    if (email) allowedFields.email = email;
    if (phoneNumber) allowedFields.phoneNumber = phoneNumber;
    if (storeLocation) allowedFields.storeLocation = storeLocation;

    try {
      const updatedUser = await strapi.entityService.update(
        'plugin::users-permissions.user',
        userId,
        {
          data: allowedFields,
        }
      );

      return ctx.send({ user: updatedUser });
    } catch (error) {
      console.error('Profile update error:', error);
      return ctx.badRequest('Failed to update profile');
    }
  },
};