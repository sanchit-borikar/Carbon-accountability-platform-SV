import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-[420px] card-dashboard p-10 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-danger flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-primary-foreground font-bold">✕</span>
        </div>
        <h1 className="text-xl font-display font-bold text-foreground mb-2">Organization Not Authorized</h1>
        <p className="text-sm text-muted-foreground mb-6">Your domain is not in our authorized whitelist. Contact Endor Environmental Alliance to request access.</p>
        <div className="btn-secondary-outline px-6 py-3 text-sm font-semibold inline-block" onClick={() => navigate("/")}>← Back to Home</div>
      </div>
    </div>
  );
}
