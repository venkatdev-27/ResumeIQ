import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { clearAuthError, loginUser } from '@/redux/authSlice';
import { ROUTES } from '@/utils/constants';

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, status, error } = useSelector((state) => state.auth);

    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const fromLocation = location.state?.from;
    const redirectTo = fromLocation
        ? `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}`
        : ROUTES.home;

    useEffect(() => {
        if (isAuthenticated) {
            navigate(redirectTo, { replace: true });
        }
    }, [isAuthenticated, navigate, redirectTo]);

    useEffect(
        () => () => {
            dispatch(clearAuthError());
        },
        [dispatch],
    );

    const onSubmit = async (event) => {
        event.preventDefault();
        await dispatch(loginUser(form));
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="mx-auto flex max-w-6xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
                    <h1 className="text-2xl font-bold text-foreground">Login</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Access your ATS Resume Builder workspace.</p>

                    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            required
                            value={form.email}
                            onChange={handleInputChange}
                        />
                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            required
                            value={form.password}
                            onChange={handleInputChange}
                        />

                        {error ? <p className="text-sm text-destructive">{error}</p> : null}

                        <Button type="submit" className="w-full" loading={status === 'loading'}>
                            Login
                        </Button>
                    </form>

                    <p className="mt-4 text-sm text-muted-foreground">
                        New user?{' '}
                        <Link to={ROUTES.register} className="font-semibold text-primary hover:underline">
                            Create account
                        </Link>
                    </p>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default Login;
