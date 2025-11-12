import type { ReactNode } from 'react';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Account from './pages/Account';

import { CustomerLayout } from './components/layout/CustomerLayout';
import { RoleBasedLayout } from './components/layout/RoleBasedLayout';
import CustomerHome from './pages/customer/CustomerHome';
import CashRequest from './pages/customer/CashRequest';
import MyOrders from './pages/customer/MyOrders';
import CustomerOrderDetailPage from './pages/customer/CustomerOrderDetailPage';
import ManageAddresses from './pages/customer/ManageAddresses';
import History from './pages/customer/History';

import { RunnerLayout } from './components/layout/RunnerLayout';
import Work from './pages/runner/Work';
import Earnings from './pages/runner/Earnings';
import More from './pages/runner/More';
import MyDeliveries from './pages/runner/MyDeliveries';
import RunnerOrderDetail from './pages/runner/RunnerOrderDetail';

import { RequireAdminAuth } from './components/auth/RequireAdminAuth';
import { AdminLayout } from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import InvitationManagement from './pages/admin/InvitationManagement';
import OrderMonitoring from './pages/admin/OrderMonitoring';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import RunnerTraining from './pages/admin/RunnerTraining';

import ProfileOnboarding from './pages/customer/OnboardingProfile';

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
    name: 'My Orders',
    path: '/customer/orders',
    element: <CustomerLayout><MyOrders /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Order Detail',
    path: '/customer/orders/:orderId',
    element: <CustomerLayout><CustomerOrderDetailPage /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Manage Addresses',
    path: '/customer/addresses',
    element: <CustomerLayout><ManageAddresses /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Order History',
    path: '/customer/history',
    element: <CustomerLayout><History /></CustomerLayout>,
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
    name: 'Not Found',
    path: '*',
    element: <NotFound />,
    visible: false
  }
];

export default routes;