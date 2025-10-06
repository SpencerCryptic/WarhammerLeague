export default (plugin) => {
  console.log('🔥 STRAPI SERVER: Loading users-permissions extensions...');
  
  // Store the original register function for later use
  let originalRegister = null;
  
  // Override the register method
  plugin.controllers.auth.register = async (ctx) => {
    console.log('🔥 PROFANITY FILTER: Register endpoint called with:', ctx.request.body);
    const { username, email, password } = ctx.request.body;
    
    // Validate username for profanity
    if (username) {
      console.log('🔥 PROFANITY FILTER: Validating username:', username);
      try {
        const { validateUsername } = await import('../../utils/profanity-filter');
        const usernameValidation = await validateUsername(username);
        console.log('🔥 PROFANITY FILTER: Validation result:', usernameValidation);
        if (!usernameValidation.isValid) {
          console.log('🔥 PROFANITY FILTER: Blocking registration due to:', usernameValidation.message);
          return ctx.badRequest(usernameValidation.message);
        }
      } catch (error) {
        console.error('🔥 PROFANITY FILTER: Error validating username:', error);
        // Continue with registration if profanity filter fails
      }
    }
    
    console.log('🔥 PROFANITY FILTER: Username passed validation, calling strapi auth register');
    
    // Get the default auth controller and call register
    try {
      const authController = strapi.plugin('users-permissions').controller('auth');
      if (authController.register && typeof authController.register === 'function') {
        return await authController.register(ctx, async () => {});
      } else {
        // Fallback to manual registration logic
        const usersPermissionsService = strapi.plugin('users-permissions').service('user');
        return await usersPermissionsService.add(ctx.request.body);
      }
    } catch (error) {
      console.error('🔥 PROFANITY FILTER: Error calling original register:', error);
      return ctx.internalServerError('Registration failed');
    }
  };
  
  console.log('🔥 STRAPI SERVER: Auth controller override complete');
  console.log('🔥 STRAPI SERVER: Extensions loaded successfully');
  return plugin;
};