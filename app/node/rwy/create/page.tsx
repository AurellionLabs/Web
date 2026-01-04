'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRWYOperatorActions } from '@/hooks/useRWYActions';
import { useWallet } from '@/hooks/useWallet';
import {
  RWYOpportunityCreationData,
  Address,
  percentToBps,
} from '@/domain/rwy';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Slider } from '@/app/components/ui/slider';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Separator } from '@/app/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  TrendingUp,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { ethers } from 'ethers';

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: Package },
  { id: 'commodities', title: 'Commodities', icon: Package },
  { id: 'economics', title: 'Economics', icon: TrendingUp },
  { id: 'timeline', title: 'Timeline', icon: Clock },
  { id: 'review', title: 'Review', icon: Shield },
];

export default function CreateRWYOpportunityPage() {
  const router = useRouter();
  const { address: walletAddress } = useWallet();
  const { createOpportunity, loading, error, txHash } = useRWYOperatorActions();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inputToken: '',
    inputTokenId: '',
    targetAmount: '',
    outputToken: '',
    expectedOutputAmount: '',
    promisedYield: 15, // Percentage
    operatorFee: 5, // Percentage
    minSalePrice: '',
    fundingDays: 14,
    processingDays: 30,
  });

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateCollateral = () => {
    if (!formData.targetAmount || !formData.minSalePrice) return '0';
    const target = ethers.parseUnits(formData.targetAmount || '0', 18);
    const price = ethers.parseUnits(formData.minSalePrice || '0', 18);
    const collateral = (target * price * 20n) / (10000n * BigInt(1e18)); // 20% collateral
    return ethers.formatEther(collateral);
  };

  const handleSubmit = async () => {
    try {
      const data: RWYOpportunityCreationData = {
        name: formData.name,
        description: formData.description,
        inputToken: formData.inputToken as Address,
        inputTokenId: formData.inputTokenId,
        targetAmount: ethers.parseUnits(formData.targetAmount, 18).toString(),
        outputToken: formData.outputToken as Address,
        expectedOutputAmount: ethers
          .parseUnits(formData.expectedOutputAmount, 18)
          .toString(),
        promisedYieldBps: percentToBps(formData.promisedYield),
        operatorFeeBps: percentToBps(formData.operatorFee),
        minSalePrice: ethers.parseUnits(formData.minSalePrice, 18).toString(),
        fundingDays: formData.fundingDays,
        processingDays: formData.processingDays,
        collateralAmount: ethers.parseEther(calculateCollateral()).toString(),
      };

      const result = await createOpportunity(data);

      // Redirect to the new opportunity
      if (result.opportunityId) {
        router.push(`/node/rwy/${result.opportunityId}`);
      }
    } catch (err) {
      console.error('Failed to create opportunity:', err);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name.length > 0 && formData.description.length > 0;
      case 1:
        return (
          formData.inputToken &&
          formData.inputTokenId &&
          formData.targetAmount &&
          formData.outputToken &&
          formData.expectedOutputAmount
        );
      case 2:
        return formData.promisedYield > 0 && formData.minSalePrice;
      case 3:
        return formData.fundingDays > 0 && formData.processingDays > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/node/rwy">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create RWY Opportunity</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new commodity processing opportunity for stakers
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                ${isActive ? 'bg-primary border-primary text-primary-foreground' : ''}
                ${!isActive && !isCompleted ? 'border-muted-foreground/30 text-muted-foreground' : ''}
              `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${isCompleted ? 'bg-emerald-500' : 'bg-muted'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>
            {currentStep === 0 &&
              'Provide basic information about your opportunity'}
            {currentStep === 1 && 'Specify input and output commodities'}
            {currentStep === 2 && 'Set yield and pricing parameters'}
            {currentStep === 3 && 'Define funding and processing timelines'}
            {currentStep === 4 && 'Review and submit your opportunity'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Opportunity Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Goat Processing Q1 2026"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the processing operation, expected outcomes, and any relevant details..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Step 1: Commodities */}
          {currentStep === 1 && (
            <>
              <div className="space-y-4">
                <h4 className="font-medium">
                  Input Commodity (What stakers provide)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inputToken">Token Contract Address</Label>
                    <Input
                      id="inputToken"
                      placeholder="0x..."
                      value={formData.inputToken}
                      onChange={(e) =>
                        updateField('inputToken', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inputTokenId">Token ID</Label>
                    <Input
                      id="inputTokenId"
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.inputTokenId}
                      onChange={(e) =>
                        updateField('inputTokenId', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Amount</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      updateField('targetAmount', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Total amount of input tokens needed from stakers
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">
                  Output Commodity (What you produce)
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="outputToken">Token Contract Address</Label>
                  <Input
                    id="outputToken"
                    placeholder="0x..."
                    value={formData.outputToken}
                    onChange={(e) => updateField('outputToken', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedOutputAmount">
                    Expected Output Amount
                  </Label>
                  <Input
                    id="expectedOutputAmount"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.expectedOutputAmount}
                    onChange={(e) =>
                      updateField('expectedOutputAmount', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Expected amount of processed tokens you will produce
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Economics */}
          {currentStep === 2 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Promised Yield</Label>
                    <span className="text-sm font-medium text-emerald-500">
                      {formData.promisedYield}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.promisedYield]}
                    onValueChange={(v) => updateField('promisedYield', v[0])}
                    min={1}
                    max={50}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    The return you promise to stakers (max 50%)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Operator Fee</Label>
                    <span className="text-sm font-medium">
                      {formData.operatorFee}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.operatorFee]}
                    onValueChange={(v) => updateField('operatorFee', v[0])}
                    min={1}
                    max={20}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your fee from the sale proceeds
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="minSalePrice">
                    Minimum Sale Price (AURUM per unit)
                  </Label>
                  <Input
                    id="minSalePrice"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.minSalePrice}
                    onChange={(e) =>
                      updateField('minSalePrice', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Floor price for selling processed commodities
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Timeline */}
          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Funding Period</Label>
                    <span className="text-sm font-medium">
                      {formData.fundingDays} days
                    </span>
                  </div>
                  <Slider
                    value={[formData.fundingDays]}
                    onValueChange={(v) => updateField('fundingDays', v[0])}
                    min={7}
                    max={60}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time allowed for stakers to fund the opportunity
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Processing Period</Label>
                    <span className="text-sm font-medium">
                      {formData.processingDays} days
                    </span>
                  </div>
                  <Slider
                    value={[formData.processingDays]}
                    onValueChange={(v) => updateField('processingDays', v[0])}
                    min={7}
                    max={180}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time to complete processing after funding
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Promised Yield
                  </p>
                  <p className="font-medium text-emerald-500">
                    {formData.promisedYield}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Amount</p>
                  <p className="font-medium">{formData.targetAmount} tokens</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Expected Output
                  </p>
                  <p className="font-medium">
                    {formData.expectedOutputAmount} tokens
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Funding Period
                  </p>
                  <p className="font-medium">{formData.fundingDays} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Processing Period
                  </p>
                  <p className="font-medium">{formData.processingDays} days</p>
                </div>
              </div>

              <Separator />

              <Alert className="border-amber-500/30 bg-amber-500/5">
                <Coins className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-500">
                  <strong>Required Collateral:</strong> {calculateCollateral()}{' '}
                  ETH
                  <br />
                  <span className="text-xs">
                    (20% of target amount × min sale price)
                  </span>
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {txHash && (
                <Alert className="border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-emerald-500">
                    Opportunity created successfully!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !canProceed()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Opportunity
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
