import { LoginPanel } from "miaoda-auth-react";

const login_config = {
  title: 'Benjamin Cash Delivery',
  desc: 'Secure cash delivery at your fingertips',
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL,
  userPolicyUrl: import.meta.env.VITE_USER_POLICY_URL,
  showPolicy: import.meta.env.VITE_SHOW_POLICY,
  policyPrefix: import.meta.env.VITE_POLICY_PREFIX,
  loginType: import.meta.env.VITE_LOGIN_TYPE
};

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginPanel {...login_config} />
    </div>
  );
}
