import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ResumeBuilder from './pages/ResumeBuilder';
import ResumePreviewPage from './pages/ResumePreviewPage';
import ATSScanner from './pages/ATSScanner';
import ATSResults from './pages/ATSResults';
import AIImprovements from './pages/AIImprovements';
import Templates from './pages/Templates';
import ProtectedRoute from './routes/ProtectedRoute';
import { ROUTES } from './utils/constants';
import { fetchCurrentUser } from './redux/authSlice';

function App() {
    const dispatch = useDispatch();
    const location = useLocation();
    const { token, user } = useSelector((state) => state.auth);

    useEffect(() => {
        if (token && !user) {
            dispatch(fetchCurrentUser());
        }
    }, [dispatch, token, user]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, [location.pathname]);

    return (
        <Routes>
            <Route path={ROUTES.home} element={<Home />} />
            <Route path={ROUTES.templates} element={<Templates />} />
            <Route path={ROUTES.login} element={<Login />} />
            <Route path={ROUTES.register} element={<Register />} />

            <Route element={<ProtectedRoute />}>
                <Route path={ROUTES.resumeBuilder} element={<ResumeBuilder />} />
                <Route path={ROUTES.resumePreview} element={<ResumePreviewPage />} />
                <Route path={ROUTES.atsScanner} element={<ATSScanner />} />
                <Route path={ROUTES.atsResults} element={<ATSResults />} />
                <Route path={ROUTES.atsImprovements} element={<AIImprovements />} />
            </Route>

            <Route path="/dashboard" element={<Navigate to={ROUTES.home} replace />} />

            <Route path="/home" element={<Navigate to={ROUTES.home} replace />} />
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
    );
}

export default App;
