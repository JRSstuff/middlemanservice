import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '@/components/ui';
import { WarningCircle } from '@phosphor-icons/react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12 max-w-md mx-auto">
      <Card padding="lg">
        <EmptyState
          icon={<WarningCircle size={48} />}
          title="Page Not Found"
          description="The escrow deal or page you're searching for doesn't exist or has expired."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          }
        />
      </Card>
    </div>
  );
};

export default NotFound;
