import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { clearAuthError, registerUser } from '@/redux/authSlice';
import { ROUTES } from '@/utils/constants';

function Register() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, registerStatus, error, registerMessage } = useSelector((state) => state.auth);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate(ROUTES.home, { replace: true });
        }
    }, [isAuthenticated, navigate]);

    useEffect(
        () => () => {
            dispatch(clearAuthError());
        },
        [dispatch],
    );

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        setLocalError('');

        if (form.password !== form.confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        const resultAction = await dispatch(
            registerUser({
                name: form.name,
                email: form.email,
                password: form.password,
                confirmPassword: form.confirmPassword,
            }),
        );

        if (registerUser.fulfilled.match(resultAction) && !resultAction.payload.token) {
            navigate(ROUTES.login, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="mx-auto flex max-w-6xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
                    <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Register to start building ATS-optimized resumes.</p>

                    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                        <Input label="Full Name" name="name" required value={form.name} onChange={handleInputChange} />
                        <Input label="Email" type="email" name="email" required value={form.email} onChange={handleInputChange} />
                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            required
                            value={form.password}
                            onChange={handleInputChange}
                        />
                        <Input
                            label="Confirm Password"
                            type="password"
                            name="confirmPassword"
                            required
                            value={form.confirmPassword}
                            onChange={handleInputChange}
                        />

                        {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        {registerMessage ? <p className="text-sm text-emerald-600">{registerMessage}</p> : null}

                        <Button type="submit" className="w-full" loading={registerStatus === 'loading'}>
                            Register
                        </Button>
                    </form>

                    <p className="mt-4 text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to={ROUTES.login} className="font-semibold text-primary hover:underline">
                            Login
                        </Link>
                    </p>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default Register;
