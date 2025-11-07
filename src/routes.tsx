import type { ReactNode } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Account from './pages/Account';

import { CustomerLayout } from './components/layout/CustomerLayout';
import CustomerHome from './pages/customer/CustomerHome';
import CashRequest from './pages/customer/CashRequest';
import MyOrders from './pages/customer/MyOrders';
import OrderTracking from './pages/customer/OrderTracking';

import { RunnerLayout } from './components/layout/RunnerLayout';
import AvailableOrders from './pages/runner/AvailableOrders';
import MyDeliveries from './pages/runner/MyDeliveries';
import RunnerOrderDetail from './pages/runner/RunnerOrderDetail';

import Dashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import InvitationManagement from './pages/admin/InvitationManagement';
import OrderMonitoring from './pages/admin/OrderMonitoring';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import RunnerTraining from './pages/admin/RunnerTraining';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <Home />,
    visible: true
  },
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    visible: false
  },
  {
    name: 'Account',
    path: '/account',
    element: <Account />,
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
    name: 'Order Tracking',
    path: '/customer/orders/:orderId',
    element: <CustomerLayout><OrderTracking /></CustomerLayout>,
    visible: false
  },
  {
    name: 'Available Orders',
    path: '/runner/available',
    element: <RunnerLayout><AvailableOrders /></RunnerLayout>,
    visible: false
  },
  {
    name: 'My Deliveries',
    path: '/runner/orders',
    element: <RunnerLayout><MyDeliveries /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Runner Order Detail',
    path: '/runner/orders/:orderId',
    element: <RunnerLayout><RunnerOrderDetail /></RunnerLayout>,
    visible: false
  },
  {
    name: 'Admin Dashboard',
    path: '/admin/dashboard',
    element: <Dashboard />,
    visible: false
  },
  {
    name: 'User Management',
    path: '/admin/users',
    element: <UserManagement />,
    visible: false
  },
  {
    name: 'Invitation Management',
    path: '/admin/invitations',
    element: <InvitationManagement />,
    visible: false
  },
  {
    name: 'Order Monitoring',
    path: '/admin/orders',
    element: <OrderMonitoring />,
    visible: false
  },
  {
    name: 'Admin Order Detail',
    path: '/admin/orders/:orderId',
    element: <AdminOrderDetail />,
    visible: false
  },
  {
    name: 'Runner Training',
    path: '/admin/training',
    element: <RunnerTraining />,
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