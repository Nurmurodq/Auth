# Quick Setup Guide

This guide will help you get started with the authentication application.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Verify Database Setup

The database is already configured with:
- ✅ User profiles table
- ✅ Row Level Security policies
- ✅ Automatic profile creation on signup
- ✅ All necessary indexes

No additional database setup required!

## Step 3: Start the Application

```bash
npm start
```

The application will open at `http://localhost:4200`

## Step 4: Create Your First User

1. Navigate to the Register page
2. Fill in your details:
   - Full Name: Your Name
   - Email: your-email@example.com
   - Password: (minimum 6 characters)
3. Click "Create Account"
4. Login with your credentials

## Step 5: Create an Admin User

To access the admin dashboard, you need to promote a user to admin:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Table Editor → profiles
3. Find your user row
4. Change the `role` column from 'user' to 'admin'
5. Logout and login again to see admin access

### Option 2: Using SQL

Run this SQL in the Supabase SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Replace `your-email@example.com` with your actual email.

## Testing the Application

### Test User Features
1. ✅ Register a new account
2. ✅ Login with credentials
3. ✅ View user dashboard
4. ✅ Edit profile information
5. ✅ Test password reset flow
6. ✅ Logout

### Test Admin Features
1. ✅ Login as admin user
2. ✅ Access admin dashboard
3. ✅ View all users
4. ✅ Enable/disable user accounts
5. ✅ Change user roles
6. ✅ View user statistics

## Common Issues

### "Cannot access admin dashboard"
- Ensure your user's role is set to 'admin' in the database
- Logout and login again after changing role

### "Email cannot be changed"
- This is by design for security reasons
- Email is linked to Supabase auth and cannot be modified

### "Build fails"
- Run: `npm install`
- Ensure Node.js version is 18 or higher
- Clear cache and reinstall if needed

## Application Routes

- `/` - Landing page (public)
- `/login` - Login page (public)
- `/register` - Registration page (public)
- `/forgot-password` - Password reset request (public)
- `/reset-password` - Set new password (public)
- `/user/dashboard` - User dashboard (authenticated only)
- `/user/profile` - Profile management (authenticated only)
- `/admin/dashboard` - Admin panel (admin only)

## Default Credentials

There are no default credentials. You must:
1. Create a user account via registration
2. Manually promote to admin using database update

This ensures maximum security!

## Next Steps

After setup:
1. Explore the user dashboard
2. Test profile management
3. Create multiple test users
4. Promote one to admin
5. Test admin user management features
6. Try the password reset flow

## Tips

- The application uses real-time authentication state
- All routes are protected with proper guards
- RLS policies ensure database-level security
- Mobile-responsive design works on all devices
- Form validation provides helpful error messages

## Need Help?

Check the main README.md for:
- Detailed feature documentation
- Architecture overview
- API reference
- Security practices
- Development guidelines

Happy testing!
