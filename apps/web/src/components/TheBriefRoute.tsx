import { useAuth } from './AuthProvider';
import Blog from '@/pages/blog/Blog';
import TheBriefAccessWall from './TheBriefAccessWall';
import { Skeleton } from '@/components/ui/skeleton';

const TheBriefRoute = () => {
  const { hasTheBriefAccess, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <Skeleton className="h-12 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (hasTheBriefAccess) {
    return <Blog />;
  }

  return <TheBriefAccessWall />;
};

export default TheBriefRoute;
