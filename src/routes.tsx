import type { ReactNode } from 'react';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Account from './pages/Account';

import { CustomerLayout } from './components/layout/CustomerLayout';
import { RoleBasedLayout } from './components/layout/RoleBasedLayout';
import CustomerHome from './pages/customer/CustomerHome';
import CashRequest from './pages/customer/CashRequest';
import ManageAddresses from './pages/customer/ManageAddresses';
import CustomerDeliveriesHistory from './pages/customer/CustomerDeliveriesHistory';
import CustomerOrderDetailPage from './pages/customer/CustomerOrderDetailPage';
import CustomerChat from './pages/customer/CustomerChat';

import { RunnerLayout } from './components/layout/RunnerLayout';
import Work from './pages/runner/Work';
import Earnings from './pages/runner/Earnings';
import More from './pages/runner/More';
import MyDeliveries from './pages/runner/MyDeliveries';
import RunnerOrderDetail from './pages/runner/RunnerOrderDetail';
import RunnerChat from './pages/runner/RunnerChat';

import { RequireAdminAuth } from './components/auth/RequireAdminAuth';
import { AdminLayout } from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import InvitationManagement from './pages/admin/InvitationManagement';
import OrderMonitoring from './pages/admin/OrderMonitoring';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import RunnerTraining from './pages/admin/RunnerTraining';

import ProfileOnboarding from './pages/customer/OnboardingProfile';
import PersonalizeOnboarding from './pages/customer/OnboardingPersonalize';
import ConnectBankOnboarding from './pages/customer/ConnectBankOnboarding';
import BankAccounts from './pages/customer/BankAccounts';
import DebugMapPage from './pages/debug/DebugMapPage';
import PlaidLinkTest from './pages/customer/PlaidLinkTest';
import { GoogleMapsProvider } from './components/maps/GoogleMapsProvider';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  // Note: '/' route is handled by redirect in App.tsx to '/customer/home'
  // Removed to prevent infinite redirect loop
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    visible: false
  },
  {
    name: 'Profile Onboarding',
    path: '/onboarding/profile',
    element: <ProfileOnboarding />,
    visible: false
  },
  {
    name: 'Personalization Onboarding',
    path: '/customer/onboarding/personalize',
    element: <CustomerLayout><PersonalizeOnboarding /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Account',
    path: '/account',
    element: <RoleBasedLayout><Account /></RoleBasedLayout>,
    visible: false
  },
  {
    name: 'Customer',
    path: '/customer',
    element: <CustomerLayout><CustomerHome /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Customer Home',
    path: '/customer/home',
    element: <CustomerLayout><CustomerHome /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Request Cash',
    path: '/customer/request',
    element: <CustomerLayout><CashRequest /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Manage Addresses',
    path: '/customer/addresses',
    element: <CustomerLayout><ManageAddresses /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Customer Deliveries',
    path: '/customer/deliveries',
    element: <CustomerLayout><CustomerDeliveriesHistory /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Customer Delivery Detail',
    path: '/customer/deliveries/:deliveryId',
    element: <CustomerLayout><CustomerOrderDetailPage /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Customer Chat',
    path: '/customer/chat/:orderId',
    element: <CustomerLayout><CustomerChat /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Connect Bank Onboarding',
    path: '/customer/onboarding/bank',
    element: <CustomerLayout><ConnectBankOnboarding /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Bank Accounts',
    path: '/customer/banks',
    element: <CustomerLayout><BankAccounts /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Plaid Link Test',
    path: '/customer/debug/plaid-link',
    element: <CustomerLayout><PlaidLinkTest /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Runner Work',
    path: '/runner',
    element: <RunnerLayout><Work /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Runner Work',
    path: '/runner/work',
    element: <RunnerLayout><Work /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Runner Earnings',
    path: '/runner/earnings',
    element: <RunnerLayout><Earnings /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Runner More',
    path: '/runner/more',
    element: <RunnerLayout><More /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Runner Home (Legacy)',
    path: '/runner/home',
    element: <RunnerLayout><Work /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Available Orders (Legacy)',
    path: '/runner/available',
    element: <RunnerLayout><Work /></RunnerLayout>,
    visible: false
  },
  {
    name: 'My Deliveries',
    path: '/runner/deliveries',
    element: <MyDeliveries />,
    visible: false
  },
  {
    name: 'Runner Order Detail',
    path: '/runner/deliveries/:orderId',
    element: <RunnerOrderDetail />,
    visible: false
  },
  {
    name: 'Runner Chat',
    path: '/runner/chat/:orderId',
    element: <RunnerChat />,
    visible: false
  },
  // Legacy routes for backwards compatibility
  {
    name: 'My Deliveries (Legacy)',
    path: '/runner/orders',
    element: <MyDeliveries />,
    visible: false
  },
  {
    name: 'Runner Order Detail (Legacy)',
    path: '/runner/orders/:orderId',
    element: <RunnerOrderDetail />,
    visible: false
  },
  {
    name: 'Admin Dashboard',
    path: '/admin/dashboard',
    element: <RequireAdminAuth><AdminLayout><Dashboard /></AdminLayout></RequireAdminAuth>,
    visible: false
  },
  {
    name: 'User Management',
    path: '/admin/users',
    element: <RequireAdminAuth><AdminLayout><UserManagement /></AdminLayout></RequireAdminAuth>,
    visible: false
  },
  {
    name: 'Invitation Management',
    path: '/admin/invitations',
    element: <RequireAdminAuth><AdminLayout><InvitationManagement /></AdminLayout></RequireAdminAuth>,
    visible: false
  },
  {
    name: 'Order Monitoring',
    path: '/admin/orders',
    element: <RequireAdminAuth><AdminLayout><OrderMonitoring /></AdminLayout></RequireAdminAuth>,
    visible: false
  },
  {
    name: 'Admin Order Detail',
    path: '/admin/orders/:orderId',
    element: <RequireAdminAuth><AdminLayout><AdminOrderDetail /></AdminLayout></RequireAdminAuth>,
    visible: false
  },
  {
    name: 'Runner Training',
    path: '/admin/training',
    element: <RequireAdminAuth><AdminLayout><RunnerTraining /></AdminLayout></RequireAdminAuth>,
    visible: false
  },
  {
    name: 'Debug Map',
    path: '/debug/map',
    element: (
      <GoogleMapsProvider>
        <DebugMapPage />
      </GoogleMapsProvider>
    ),
    visible: false
  },
  {
    name: 'Not Found',
    path: '*',
    element: <NotFound />,
    visible: false
  }
];

export default routes;