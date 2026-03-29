import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

const RoleBasedRedirector = () => {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) {
      // Wait until the role is loaded
      return;
    }

    if (!role) {
      // Should be caught by ProtectedRoute, but as a fallback
      navigate('/auth');
      return;
    }

    // --- Role-Based Redirect Logic ---
    switch (role) {
      case 'admin':
      case 'author':
        navigate('/dashboard/blog', { replace: true });
        break;
      case 'client':
        // The /dashboard/overview route's ProtectedRoute will handle the blueprint check
        navigate('/dashboard/overview', { replace: true });
        break;
      default:
        // Fallback for unknown roles or if profile is somehow invalid
        navigate('/', { replace: true });
        break;
    }
  }, [role, isLoading, navigate]);

  // Render a loading spinner while the redirect is being determined
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default RoleBasedRedirector;
