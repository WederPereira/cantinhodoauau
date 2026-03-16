import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
  blockRoles?: AppRole[];
}

const ProtectedRoute: React.FC<Props> = ({ children, requiredRoles, blockRoles }) => {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequired = requiredRoles.some(r => roles.includes(r));
    if (!hasRequired) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Acesso restrito</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      );
    }
  }

  if (blockRoles && blockRoles.length > 0) {
    const isBlocked = blockRoles.some(r => roles.includes(r));
    if (isBlocked && !roles.includes('admin')) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Acesso restrito</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
