import { useAuth } from './AuthProvider';
import BlogPost from '@/pages/blog/BlogPost';
import TheBriefAccessWall from './TheBriefAccessWall';
import { Skeleton } from '@/components/ui/skeleton';

const TheBriefPostRoute = () => {
  const { hasTheBriefAccess, isLoading, isBriefAccessLoading } = useAuth();

  if (isLoading || isBriefAccessLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (hasTheBriefAccess) {
    return <BlogPost />;
  }

  return <TheBriefAccessWall />;
};

export default TheBriefPostRoute;
