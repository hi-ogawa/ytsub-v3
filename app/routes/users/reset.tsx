import { useNavigate, useSearchParams } from "@remix-run/react";
import React from "react";
import { toast } from "react-hot-toast";
import { $R, ROUTE_DEF } from "../../misc/routes";

// use this temporary route to simplify client-oritented session manipulation

//
// component
//

export default function PageComponent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    const parsed = ROUTE_DEF["/users/reset"].query.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (parsed.success) {
      if (parsed.data.type === "register") {
        toast.success("Successfully registered");
      }
      if (parsed.data.type === "signin") {
        toast.success("Successfully signed in");
      }
      if (parsed.data.type === "signout") {
        toast.success("Successfully signed out");
      }
    }
    navigate($R["/"](), { replace: true });
  }, []);

  return null;
}
