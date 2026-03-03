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
  EvaPanel,
  TrapButton,
  EvaProgress,
  EvaSectionMarker,
  EvaScanLine,
  GreekKeyStrip,
  LaurelAccent,
} from '@/app/components/eva/eva-components';
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
import { formatWeiToEther, parseTokenAmount, parseEth } from '@/lib/utils';

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: Package },
  { id: 'commodities', title: 'Commodities', icon: Package },
  { id: 'economics', title: 'Economics', icon: TrendingUp },
  { id: 'timeline', title: 'Timeline', icon: Clock },
  { id: 'review', title: 'Review', icon: Shield },
];

const STEP_DESCRIPTIONS = [
  'Provide basic information about your opportunity',
  'Specify input and output commodities',
  'Set yield and pricing parameters',
  'Define funding and processing timelines',
  'Review and submit your opportunity',
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
    const target = parseTokenAmount(formData.targetAmount || '0', 18);
    const price = parseTokenAmount(formData.minSalePrice || '0', 18);
    const collateral = (target * price * 20n) / (10000n * BigInt(1e18)); // 20% collateral
    return formatWeiToEther(collateral);
  };

  const handleSubmit = async () => {
    try {
      const data: RWYOpportunityCreationData = {
        name: formData.name,
        description: formData.description,
        inputToken: formData.inputToken as Address,
        inputTokenId: formData.inputTokenId,
        targetAmount: parseTokenAmount(formData.targetAmount, 18).toString(),
        outputToken: formData.outputToken as Address,
        expectedOutputAmount: parseTokenAmount(
          formData.expectedOutputAmount,
          18,
        ).toString(),
        promisedYieldBps: percentToBps(formData.promisedYield),
        operatorFeeBps: percentToBps(formData.operatorFee),
        minSalePrice: parseTokenAmount(formData.minSalePrice, 18).toString(),
        fundingDays: formData.fundingDays,
        processingDays: formData.processingDays,
        collateralAmount: parseEth(calculateCollateral()).toString(),
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
        <div className="flex items-center gap-3">
          <LaurelAccent side="left" />
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-[0.15em] uppercase">
              Create RWY Opportunity
            </h1>
            <p className="font-mono text-sm text-foreground/50 mt-2 tracking-wider">
              Set up a new commodity processing opportunity for stakers
            </p>
          </div>
          <LaurelAccent side="right" />
        </div>
      </div>

      <GreekKeyStrip color="gold" />

      {/* Progress Steps */}
      <EvaSectionMarker
        section="PROGRESS"
        label={`Step ${currentStep + 1} of ${STEPS.length}`}
        variant="gold"
      />

      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                flex items-center justify-center w-10 h-10 transition-colors
                ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : ''}
                ${isActive ? 'bg-gold/15 text-gold' : ''}
                ${!isActive && !isCompleted ? 'bg-background/40 text-foreground/30' : ''}
              `}
                style={{
                  clipPath:
                    'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-[2px] mx-2 ${isCompleted ? 'bg-emerald-500/50' : 'bg-border/20'}`}
                  style={{
                    clipPath:
                      'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <EvaProgress
        value={((currentStep + 1) / STEPS.length) * 100}
        color={currentStep === STEPS.length - 1 ? 'emerald' : 'gold'}
        segments={STEPS.length * 4}
      />

      <div className="mt-6" />

      {/* Form Panel */}
      <EvaPanel
        label={STEPS[currentStep].title}
        sublabel={STEP_DESCRIPTIONS[currentStep]}
        sysId={`STEP-${String(currentStep + 1).padStart(2, '0')}`}
        status={currentStep === STEPS.length - 1 ? 'active' : 'pending'}
      >
        <div className="space-y-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                >
                  Opportunity Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Goat Processing Q1 2026"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                >
                  Description
                </Label>
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
                <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-gold font-bold">
                  Input Commodity (What stakers provide)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="inputToken"
                      className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                    >
                      Token Contract Address
                    </Label>
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
                    <Label
                      htmlFor="inputTokenId"
                      className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                    >
                      Token ID
                    </Label>
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
                  <Label
                    htmlFor="targetAmount"
                    className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                  >
                    Target Amount
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      updateField('targetAmount', e.target.value)
                    }
                  />
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
                    Total amount of input tokens needed from stakers
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-mono text-xs tracking-[0.2em] uppercase text-gold font-bold">
                  Output Commodity (What you produce)
                </h4>
                <div className="space-y-2">
                  <Label
                    htmlFor="outputToken"
                    className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                  >
                    Token Contract Address
                  </Label>
                  <Input
                    id="outputToken"
                    placeholder="0x..."
                    value={formData.outputToken}
                    onChange={(e) => updateField('outputToken', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="expectedOutputAmount"
                    className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                  >
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
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
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
                    <Label className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold">
                      Promised Yield
                    </Label>
                    <span className="font-mono text-sm font-bold text-emerald-400 tracking-wider">
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
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
                    The return you promise to stakers (max 50%)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold">
                      Operator Fee
                    </Label>
                    <span className="font-mono text-sm font-bold text-gold tracking-wider">
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
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
                    Your fee from the sale proceeds
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label
                    htmlFor="minSalePrice"
                    className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold"
                  >
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
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
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
                    <Label className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold">
                      Funding Period
                    </Label>
                    <span className="font-mono text-sm font-bold text-gold tracking-wider">
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
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
                    Time allowed for stakers to fund the opportunity
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/50 font-bold">
                      Processing Period
                    </Label>
                    <span className="font-mono text-sm font-bold text-gold tracking-wider">
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
                  <p className="font-mono text-[10px] text-foreground/40 tracking-wider">
                    Time to complete processing after funding
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <EvaSectionMarker
                section="SUMMARY"
                label="Final Review"
                variant="gold"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                    Name
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground/80 mt-1">
                    {formData.name}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                    Promised Yield
                  </p>
                  <p className="font-mono text-sm font-bold text-emerald-400 mt-1">
                    {formData.promisedYield}%
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                    Target Amount
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground/80 mt-1">
                    {formData.targetAmount} tokens
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                    Expected Output
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground/80 mt-1">
                    {formData.expectedOutputAmount} tokens
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                    Funding Period
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground/80 mt-1">
                    {formData.fundingDays} days
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 font-bold">
                    Processing Period
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground/80 mt-1">
                    {formData.processingDays} days
                  </p>
                </div>
              </div>

              <EvaScanLine variant="mixed" />

              <Alert className="border-amber-500/30 bg-amber-500/5">
                <Coins className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-500">
                  <strong className="font-mono tracking-wider uppercase text-xs">
                    Required Collateral:
                  </strong>{' '}
                  <span className="font-mono font-bold">
                    {calculateCollateral()} ETH
                  </span>
                  <br />
                  <span className="font-mono text-[10px] tracking-wider">
                    (20% of target amount x min sale price)
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
                  <AlertDescription className="font-mono text-emerald-400 tracking-wider">
                    Opportunity created successfully!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <EvaScanLine variant="gold" />
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <TrapButton
              variant="gold"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
            >
              <span className="flex items-center gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </span>
            </TrapButton>
          ) : (
            <TrapButton
              variant="emerald"
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Create Opportunity
                  </>
                )}
              </span>
            </TrapButton>
          )}
        </div>
      </EvaPanel>

      <div className="mt-4" />
      <GreekKeyStrip color="crimson" />
    </div>
  );
}
