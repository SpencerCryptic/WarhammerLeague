'use strict';

/**
 * User controller
 */

export default {
  async me(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest('User not found');
    }
    
    const sanitizedUser = await strapi
      .plugin('users-permissions')
      .service('user')
      .sanitizeUser(user);
      
    ctx.send(sanitizedUser);
  },

  async updateProfile(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.badRequest('User not found');
    }

    const { firstName, lastName, phoneNumber, dateOfBirth, storeLocation } = ctx.request.body;

    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: {
          firstName,
          lastName,
          phoneNumber,
          dateOfBirth,
          storeLocation,
        },
      });

      const sanitizedUser = await strapi
        .plugin('users-permissions')
        .service('user')
        .sanitizeUser(updatedUser);

      ctx.send(sanitizedUser);
    } catch (error) {
      ctx.badRequest('Failed to update profile');
    }
  },
};