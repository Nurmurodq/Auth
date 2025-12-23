# Authentication Application

A comprehensive role-based authentication system built with Angular, TypeScript, and Supabase. This application provides complete user and admin authentication functionality with modern security practices.

## Features

### User Authentication
- User registration with automatic profile creation
- Secure login/logout functionality
- Password reset via email
- Profile management (view and edit personal details)
- Protected user routes with route guards
- Responsive design for all devices

### Admin Features
- Admin login with elevated privileges
- User management dashboard
- View all users with detailed information
- Enable/disable user accounts
- Promote users to admin or demote to regular user
- Real-time user statistics
- Admin-only protected routes

### Security
- Row Level Security (RLS) policies in Supabase
- Role-based access control (RBAC)
- Secure password handling
- Protected routes with Angular Guards
- JWT-based authentication
- Automatic session management

## Tech Stack

- **Frontend**: Angular 21+ with TypeScript
- **Backend**: Supabase (PostgreSQL database, Authentication)
- **Styling**: Custom CSS with responsive design
- **Forms**: Angular Reactive Forms
- **Routing**: Angular Router with Guards

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── admin/
│   │   │   └── dashboard.component.ts       # Admin user management
│   │   ├── auth/
│   │   │   ├── login.component.ts          # User login
│   │   │   ├── register.component.ts       # User registration
│   │   │   ├── forgot-password.component.ts # Password reset request
│   │   │   └── reset-password.component.ts  # New password form
│   │   ├── landing/
│   │   │   └── landing.component.ts        # Landing page
│   │   └── user/
│   │       ├── dashboard.component.ts      # User dashboard
│   │       └── profile.component.ts        # Profile management
│   ├── guards/
│   │   ├── auth.guard.ts                   # Authenticated user guard
│   │   └── admin.guard.ts                  # Admin-only guard
│   ├── models/
│   │   └── user.model.ts                   # TypeScript interfaces
│   └── services/
│       ├── auth.service.ts                 # Authentication logic
│       └── supabase.service.ts             # Supabase client
├── environments/
│   └── environment.ts                      # Environment configuration
├── global_styles.css                       # Global styles
├── main.ts                                 # Application bootstrap & routing
└── index.html                              # HTML entry point
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   The database schema is already configured with:
   - `profiles` table with user information
   - Row Level Security policies
   - Automatic trigger to create profiles on user signup
   - Indexes for optimal performance

3. **Run the Application**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:4200`

4. **Build for Production**
   ```bash
   npm run build
   ```

## Usage Guide

### For Regular Users

1. **Registration**
   - Navigate to the registration page
   - Enter full name, email, and password
   - Account is created automatically

2. **Login**
   - Use email and password to sign in
   - Redirected to user dashboard upon success

3. **User Dashboard**
   - View account information
   - Access quick actions
   - Navigate to profile management

4. **Profile Management**
   - Update full name
   - Add/change avatar URL
   - View account status and creation date

5. **Password Reset**
   - Click "Forgot password" on login page
   - Enter email to receive reset link
   - Click link in email and set new password

### For Administrators

1. **Access Admin Dashboard**
   - Login with admin credentials
   - Automatically redirected to admin dashboard

2. **User Management**
   - View all registered users
   - See user statistics (total, active, admins)
   - Enable or disable user accounts
   - Promote users to admin or demote to regular user

3. **User Actions**
   - **Enable/Disable**: Toggle user account status
   - **Change Role**: Switch between user and admin roles
   - Cannot modify own account to prevent lockout

## Database Schema

### profiles Table
```sql
- id (uuid, primary key) - Links to auth.users
- email (text) - User's email
- full_name (text) - User's full name
- role (text) - 'user' or 'admin'
- is_active (boolean) - Account status
- avatar_url (text, nullable) - Profile picture URL
- created_at (timestamptz) - Creation timestamp
- updated_at (timestamptz) - Last update timestamp
```

### Row Level Security Policies

**For Users:**
- Read their own profile
- Update their own profile (except role and is_active)

**For Admins:**
- Read all profiles
- Update any profile (including role and is_active)

## API Endpoints (Supabase)

### Authentication
- `auth.signUp()` - Register new user
- `auth.signInWithPassword()` - Login
- `auth.signOut()` - Logout
- `auth.resetPasswordForEmail()` - Request password reset
- `auth.updateUser()` - Update password

### Database Operations
- `from('profiles').select()` - Get user profiles
- `from('profiles').update()` - Update user profile
- `from('profiles').insert()` - Create profile (triggered automatically)

## Routes

| Route | Component | Guard | Description |
|-------|-----------|-------|-------------|
| `/` | Landing | None | Home page |
| `/login` | Login | None | User login |
| `/register` | Register | None | User registration |
| `/forgot-password` | ForgotPassword | None | Password reset request |
| `/reset-password` | ResetPassword | None | Set new password |
| `/user/dashboard` | UserDashboard | AuthGuard | User dashboard |
| `/user/profile` | UserProfile | AuthGuard | Profile management |
| `/admin/dashboard` | AdminDashboard | AdminGuard | Admin panel |

## Security Best Practices

1. **Password Security**
   - Minimum 6 characters required
   - Passwords are hashed by Supabase
   - Secure password reset flow

2. **Access Control**
   - Route guards prevent unauthorized access
   - RLS policies enforce database-level security
   - Role-based permissions

3. **Data Protection**
   - Users can only access their own data
   - Admins have controlled elevated access
   - No sensitive data exposed in client

4. **Session Management**
   - Automatic session handling
   - Secure JWT tokens
   - Auth state synchronization

## Styling & Responsiveness

The application features:
- Modern, clean design with gradient accents
- Fully responsive layout (mobile, tablet, desktop)
- Consistent color scheme
- Smooth transitions and hover effects
- Accessible form controls
- Loading states and error messages

## Error Handling

The application includes comprehensive error handling:
- Form validation with helpful error messages
- API error handling with user-friendly messages
- Loading states for async operations
- Success confirmations for user actions

## Development

### Adding New Features

1. **New Component**
   - Create component in appropriate directory
   - Add to routing in `main.ts`
   - Apply necessary guards

2. **New Database Table**
   - Create migration with RLS policies
   - Add TypeScript interface in `models/`
   - Create service methods if needed

3. **New Route Guard**
   - Create guard in `guards/` directory
   - Implement `canActivate` method
   - Add to route configuration

## Testing

To test the admin functionality:

1. Create a regular user account
2. Manually promote user to admin:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```
3. Login to access admin dashboard

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

### Authentication Issues
- Check Supabase credentials in environment file
- Verify database migrations are applied
- Check browser console for errors

### Permission Issues
- Verify RLS policies are enabled
- Check user role in database
- Ensure user account is active

## Future Enhancements

Potential features to add:
- Email verification on signup
- Two-factor authentication
- User activity logs
- Advanced admin analytics
- Bulk user operations
- User search and filtering
- Export user data
- Custom user permissions

## License

This project is open source and available for educational purposes.

## Support

For issues or questions, please check the documentation or review the code comments for detailed explanations of complex logic.
