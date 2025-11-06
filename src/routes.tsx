import type { ReactNode } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

import CashRequest from './pages/customer/CashRequest';
import MyOrders from './pages/customer/MyOrders';
import OrderTracking from './pages/customer/OrderTracking';

import AvailableOrders from './pages/runner/AvailableOrders';
import MyDeliveries from './pages/runner/MyDeliveries';
import RunnerOrderDetail from './pages/runner/RunnerOrderDetail';

import Dashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import InvitationManagement from './pages/admin/InvitationManagement';
import OrderMonitoring from './pages/admin/OrderMonitoring';

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
    name: 'Request Cash',
    path: '/customer/request',
    element: <CashRequest />,
    visible: false
  },
  {
    name: 'My Orders',
    path: '/customer/orders',
    element: <MyOrders />,
    visible: false
  },
  {
    name: 'Order Tracking',
    path: '/customer/orders/:orderId',
    element: <OrderTracking />,
    visible: false
  },
  {
    name: 'Available Orders',
    path: '/runner/available',
    element: <AvailableOrders />,
    visible: false
  },
  {
    name: 'My Deliveries',
    path: '/runner/orders',
    element: <MyDeliveries />,
    visible: false
  },
  {
    name: 'Runner Order Detail',
    path: '/runner/orders/:orderId',
    element: <RunnerOrderDetail />,
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
    name: 'Not Found',
    path: '*',
    element: <NotFound />,
    visible: false
  }
];

export default routes;