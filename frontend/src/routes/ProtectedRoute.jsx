import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/utils/constants';

function ProtectedRoute() {
    const location = useLocation();
    const { isAuthenticated, token } = useSelector((state) => state.auth);

    if (!isAuthenticated && !token) {
        return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
