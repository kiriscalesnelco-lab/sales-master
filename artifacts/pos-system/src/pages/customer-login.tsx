import { useState } from "react";
import { useLocation } from "wouter";
import { useRequestOtp, useVerifyOtp, useRegisterCustomerPortal } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, Smartphone, ShieldCheck, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "mobile" | "otp" | "register";

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();
  const registerMutation = useRegisterCustomerPortal();

  const handleRequestOtp = async () => {
    if (!mobile.trim()) {
      toast({ title: "Enter your mobile number", variant: "destructive" });
      return;
    }
    try {
      const res = await requestOtpMutation.mutateAsync({ mobile: mobile.trim() });
      setDemoOtp(res.otp);
      setStep("otp");
      toast({ title: "OTP Generated", description: `Demo OTP: ${res.otp}` });
    } catch {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast({ title: "Enter the OTP", variant: "destructive" });
      return;
    }
    try {
      const res = await verifyOtpMutation.mutateAsync({ mobile: mobile.trim(), otp: otp.trim() });
      if (!res.isVerified) {
        toast({ title: "Invalid OTP", variant: "destructive" });
        return;
      }
      if (res.isNew) {
        setStep("register");
      } else {
        sessionStorage.setItem("customerMobile", res.mobile);
        sessionStorage.setItem("customerName", res.customerName ?? "");
        navigate("/customer/shop");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid or expired OTP";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      toast({ title: "Enter your name", variant: "destructive" });
      return;
    }
    try {
      const res = await registerMutation.mutateAsync({ mobile: mobile.trim(), name: name.trim() });
      sessionStorage.setItem("customerMobile", res.mobile);
      sessionStorage.setItem("customerName", res.customerName ?? name);
      navigate("/customer/shop");
    } catch {
      toast({ title: "Registration failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-white mb-4">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Retail POS</h1>
          <p className="text-muted-foreground mt-1">Customer Ordering Portal</p>
        </div>

        {step === "mobile" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Enter Mobile Number
              </CardTitle>
              <CardDescription>
                We'll send you an OTP to verify your identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
              />
              <Button
                className="w-full"
                onClick={handleRequestOtp}
                disabled={requestOtpMutation.isPending}
              >
                {requestOtpMutation.isPending ? "Sending…" : "Get OTP"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "otp" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Verify OTP
              </CardTitle>
              <CardDescription>
                Enter the 6-digit OTP sent to {mobile}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoOtp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                  <strong>Demo Mode — Your OTP:</strong>{" "}
                  <span className="font-mono text-lg font-bold tracking-widest">{demoOtp}</span>
                </div>
              )}
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />
              <Button
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending ? "Verifying…" : "Verify OTP"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("mobile")}>
                Change Number
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "register" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Create Your Account
              </CardTitle>
              <CardDescription>
                First time here! Tell us your name to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
              <p className="text-sm text-muted-foreground">Mobile: {mobile}</p>
              <Button
                className="w-full"
                onClick={handleRegister}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Registering…" : "Register & Continue"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
