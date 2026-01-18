# Code Cleanup Plan - Beyond Diagnosis

## Summary

After analyzing all project files, I've identified the following issues to clean up:

---

## 1. UNUSED COMPONENT FILES (25 files)

These components form orphaned chains - they are not imported anywhere in the active codebase. The main app flow is:
- `App.tsx` → `SinglePageDataRequestIntegrated` → `DashboardTabs` → Tab components

### DashboardEnhanced Chain (5 files)
Files only used by `DashboardEnhanced.tsx` which itself is never imported:
- `components/DashboardEnhanced.tsx`
- `components/DashboardNavigation.tsx`
- `components/HeatmapEnhanced.tsx`
- `components/OpportunityMatrixEnhanced.tsx`
- `components/EconomicModelEnhanced.tsx`

### DashboardReorganized Chain (12 files)
Files only used by `DashboardReorganized.tsx` which itself is never imported:
- `components/DashboardReorganized.tsx`
- `components/HeatmapPro.tsx`
- `components/OpportunityMatrixPro.tsx`
- `components/RoadmapPro.tsx`
- `components/EconomicModelPro.tsx`
- `components/BenchmarkReportPro.tsx`
- `components/VariabilityHeatmap.tsx`
- `components/AgenticReadinessBreakdown.tsx`
- `components/HourlyDistributionChart.tsx`

### Shared but now orphaned (3 files)
Used only by the orphaned DashboardEnhanced and DashboardReorganized:
- `components/HealthScoreGaugeEnhanced.tsx`
- `components/DimensionCard.tsx`
- `components/BadgePill.tsx`

### Completely orphaned (5 files)
Not imported anywhere at all:
- `components/DataUploader.tsx`
- `components/DataUploaderEnhanced.tsx`
- `components/Roadmap.tsx` (different from RoadmapTab.tsx which IS used)
- `components/BenchmarkReport.tsx`
- `components/ProgressStepper.tsx`
- `components/TierSelectorEnhanced.tsx`
- `components/DimensionDetailView.tsx`
- `components/TopOpportunitiesCard.tsx`

---

## 2. DUPLICATE IMPORTS (1 issue)

### RoadmapTab.tsx (lines 4-5)
`AlertCircle` is imported twice from lucide-react.

**Before:**
```tsx
import {
  Clock, DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  ArrowRight, Info, Users, Target, Zap, Shield, AlertCircle,
  ChevronDown, ChevronUp, BookOpen, Bot, Settings, Rocket
} from 'lucide-react';
```
Note: `AlertCircle` appears on line 5

**Fix:** Remove duplicate import

---

## 3. DUPLICATE FUNCTIONS (1 issue)

### formatDate function
Duplicated in two active files:
- `SinglePageDataRequestIntegrated.tsx` (lines 14-21)
- `DashboardHeader.tsx` (lines 25-32)

**Recommendation:** Create a shared utility function in `utils/formatters.ts` and import from there.

---

## 4. SHADOWED TYPES (1 issue)

### realDataAnalysis.ts
Has a local `SkillMetrics` interface (lines 235-252) that shadows the one imported from `types.ts`.

**Recommendation:** Remove local interface and use the imported one, or rename to avoid confusion.

---

## 5. UNUSED IMPORTS IN FILES (Minor)

Several files have console.log debug statements that could be removed for production:
- `HeatmapPro.tsx` - multiple debug console.logs
- `OpportunityMatrixPro.tsx` - debug console.logs

---

## Action Plan

### Phase 1: Safe Fixes (No functionality change)
1. Fix duplicate import in RoadmapTab.tsx
2. Consolidate formatDate function to shared utility

### Phase 2: Dead Code Removal (Files to delete)
Delete all 25 unused component files listed above.

### Phase 3: Type Cleanup
Fix shadowed SkillMetrics type in realDataAnalysis.ts

---

## Files to Keep (Active codebase)

### App Entry
- `App.tsx`
- `index.tsx`

### Components (Active)
- `SinglePageDataRequestIntegrated.tsx`
- `DashboardTabs.tsx`
- `DashboardHeader.tsx`
- `DataInputRedesigned.tsx`
- `LoginPage.tsx`
- `ErrorBoundary.tsx`
- `MethodologyFooter.tsx`
- `MetodologiaDrawer.tsx`
- `tabs/ExecutiveSummaryTab.tsx`
- `tabs/DimensionAnalysisTab.tsx`
- `tabs/AgenticReadinessTab.tsx`
- `tabs/RoadmapTab.tsx`
- `charts/WaterfallChart.tsx`

### Utils (Active)
- `apiClient.ts`
- `AuthContext.tsx`
- `analysisGenerator.ts`
- `backendMapper.ts`
- `realDataAnalysis.ts`
- `fileParser.ts`
- `syntheticDataGenerator.ts`
- `dataTransformation.ts`
- `segmentClassifier.ts`
- `agenticReadinessV2.ts`

### Config (Active)
- `types.ts`
- `constants.ts`
- `styles/colors.ts`
- `config/skillsConsolidation.ts`
