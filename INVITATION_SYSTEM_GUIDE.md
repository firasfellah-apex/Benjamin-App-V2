# Invitation System Guide

## Overview

The Benjamin Cash Delivery Service uses an invitation-based system for onboarding Runners and additional Admins. This ensures controlled access and proper role assignment.

## How It Works

### For Admins: Sending Invitations

1. **Navigate to Invitation Management**
   - Log in as an admin
   - Click "Invitations" in the navigation menu

2. **Create an Invitation**
   - Click "Send Invitation" button
   - Fill in the invitation form:
     - **Email**: Invitee's email address (required)
     - **Role**: Select "Runner" or "Admin" (required)
     - **First Name**: Optional, for personalization
     - **Last Name**: Optional, for personalization
     - **Notes**: Optional, internal notes about the invitation

3. **Share the Invitation Link**
   - After creating the invitation, a dialog will appear with:
     - **Invitation Link**: A unique URL with the invitation token
     - **Copy Button**: Click to copy the link to clipboard
     - **Invitation Details**: Summary of the invitation
   
4. **Send the Link**
   - Copy the invitation link
   - Send it to the invitee via:
     - Email
     - Text message
     - Messaging app (WhatsApp, Telegram, etc.)
     - Any other communication method

5. **Track Invitation Status**
   - View all invitations in the table
   - See status: Pending, Accepted, Expired, or Revoked
   - Copy link again for pending invitations
   - Revoke pending invitations if needed

### For Invitees: Accepting Invitations

1. **Receive the Invitation Link**
   - You'll receive a link from an admin
   - Example: `https://yourapp.com/login?invitation=abc123...`

2. **Click the Link**
   - Click the invitation link
   - You'll be taken to the login page
   - A banner will show you're joining via invitation

3. **Sign In with Google**
   - Click "Sign in with Google"
   - Complete the Google OAuth flow
   - If you're a new user, an account will be created

4. **Automatic Role Assignment**
   - After signing in, your account is automatically updated
   - The invited role (Runner or Admin) is assigned
   - You'll see a success message
   - You're redirected to the home page

5. **Start Using the Platform**
   - Your navigation menu will show options for your role
   - Runners can view available orders
   - Admins can access the admin dashboard

## Important Notes

### Invitation Expiration
- Invitations expire after **7 days**
- Expired invitations cannot be used
- Admins can create a new invitation if needed

### Invitation Security
- Each invitation link is unique and single-use
- Once accepted, the link cannot be used again
- Invitations can be revoked by admins before acceptance

### Role Assignment
- **Customer Role**: Automatically assigned to all new users
- **Runner Role**: Only via invitation
- **Admin Role**: First user + invitations
- **Multiple Roles**: Users can have multiple roles (e.g., Admin + Runner)

### Email Notifications (MVP Note)
- **Current Implementation**: Manual link sharing
- **Future Enhancement**: Automatic email sending
- For now, admins must manually send invitation links

## Troubleshooting

### "Invalid or expired invitation link"
- The invitation may have expired (7 days)
- The invitation may have been revoked
- The invitation may have already been used
- Contact the admin for a new invitation

### "Failed to accept invitation"
- Try logging out and clicking the invitation link again
- Clear your browser cache and cookies
- Contact support if the issue persists

### Not seeing the invited role
- Log out and log back in
- Check with the admin that the invitation was accepted
- Verify the invitation status in the admin panel

## Admin Best Practices

1. **Verify Email Addresses**
   - Double-check email addresses before creating invitations
   - Typos will result in the wrong person receiving the link

2. **Track Invitations**
   - Regularly review pending invitations
   - Revoke unused invitations after a reasonable time
   - Follow up with invitees who haven't accepted

3. **Secure Link Sharing**
   - Send invitation links through secure channels
   - Don't post invitation links publicly
   - Revoke links if sent to wrong recipients

4. **Role Assignment**
   - Carefully select the appropriate role
   - Consider starting with Runner role and upgrading later
   - Multiple admins provide backup access

## Example Workflow

### Inviting a New Runner

1. Admin creates invitation:
   - Email: runner@example.com
   - Role: Runner
   - First Name: John
   - Last Name: Doe

2. Admin copies the invitation link:
   ```
   https://yourapp.com/login?invitation=550e8400-e29b-41d4-a716-446655440000
   ```

3. Admin sends link via email:
   ```
   Hi John,

   You've been invited to join Benjamin Cash Delivery as a Runner!

   Click this link to get started:
   https://yourapp.com/login?invitation=550e8400-e29b-41d4-a716-446655440000

   This link will expire in 7 days.

   Thanks!
   ```

4. John clicks the link and signs in with Google

5. John's account is automatically assigned the Runner role

6. John can now view and accept delivery orders

## Technical Details

### Invitation Token
- Generated using `crypto.randomUUID()`
- Stored securely in the database
- Validated on each use
- Single-use only

### Database Records
- Invitation record created with status "Pending"
- Token, email, role, and expiration stored
- Status updated to "Accepted" when used
- Audit trail maintained

### Security Measures
- Tokens are cryptographically secure
- Expiration enforced server-side
- Single-use validation
- Role assignment controlled by database policies

## Future Enhancements

### Planned Features
1. **Automatic Email Sending**
   - Integration with email service (SendGrid, AWS SES)
   - Customizable email templates
   - Automatic reminder emails

2. **Bulk Invitations**
   - CSV upload for multiple invitations
   - Batch invitation creation
   - Progress tracking

3. **Invitation Analytics**
   - Acceptance rate tracking
   - Time-to-acceptance metrics
   - Conversion funnel analysis

4. **Custom Expiration**
   - Configurable expiration periods
   - Extend expiration for pending invitations
   - Never-expire option for special cases

## Support

If you encounter any issues with the invitation system:

1. Check this guide for troubleshooting steps
2. Contact your admin for new invitations
3. Review the invitation status in the admin panel
4. Check the browser console for error messages

---

**Last Updated**: November 6, 2025  
**Version**: 1.0.0
