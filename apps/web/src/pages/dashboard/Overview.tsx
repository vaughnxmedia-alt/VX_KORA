import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { User, CheckCircle, Plus, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function Overview() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {user?.user_metadata?.first_name || "User"}!
          </h1>
          <p className="text-lg text-muted-foreground">
            {role === 'admin' 
              ? "Global Business Dashboard - Manage all clients and strategy."
              : "Your personal dashboard for brand management."}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/blueprints')}>
          <CardContent className="p-6 text-center">
            <Plus className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {role === 'admin' ? 'View All Blueprints' : 'View Your Blueprint'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {role === 'admin' 
                ? "Access and manage blueprints across all clients" 
                : "Access your comprehensive brand strategy analysis"}
            </p>
          </CardContent>
        </Card>

        {role === 'client' && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/work-with-me')}>
            <CardContent className="p-6 text-center">
              <Building className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Work With Me</h3>
              <p className="text-sm text-muted-foreground">
                Explore our services and consultation options
              </p>
            </CardContent>
          </Card>
        )}
        
        {role === 'admin' && (
           <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/clients')}>
           <CardContent className="p-6 text-center">
             <User className="w-12 h-12 text-accent mx-auto mb-4" />
             <h3 className="text-lg font-semibold mb-2">Manage Clients</h3>
             <p className="text-sm text-muted-foreground">
               View and manage client profiles
             </p>
           </CardContent>
         </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
            <p className="text-muted-foreground mb-4">
              {role === 'admin' ? "System status is quiet." : "Get started by creating your first brand blueprint."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

