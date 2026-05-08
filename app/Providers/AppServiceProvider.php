<?php

namespace App\Providers;

use App\Domain\Auth\Support\JwtTokenIssuer;
use App\Domain\Business\Policies\BusinessPolicy;
use App\Domain\Compliance\Policies\AuditLogPolicy;
use App\Domain\Compliance\Policies\ConsentPolicy;
use App\Domain\Compliance\Policies\ErasurePolicy;
use App\Domain\Compliance\Support\AuditLogger;
use App\Domain\Governance\Policies\DriftMetricsPolicy;
use App\Domain\Governance\Policies\FairnessAuditPolicy;
use App\Domain\Lending\Policies\LoanApplicationPolicy;
use App\Domain\Macroeconomics\Policies\ExogenousFactorsPolicy;
use App\Domain\Payments\Support\EthiopianHolidayCalendar;
use App\Domain\Psychometric\Policies\PsychometricPolicy;
use App\Domain\Psychometric\Support\PsychometricNormalizer;
use App\Domain\Psychometric\Support\QuestionBank;
use App\Domain\Valuation\Policies\ValuationPolicy;
use App\Domain\Valuation\Support\ReasonCodeBuilder;
use App\Models\AuditLog;
use App\Models\Business;
use App\Models\Consent;
use App\Models\DataSubjectRequest;
use App\Models\DriftMetric;
use App\Models\ExogenousFactor;
use App\Models\FairnessAudit;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use App\Models\Valuation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Stateless support classes are safely resolved as singletons.
        $this->app->singleton(JwtTokenIssuer::class);
        $this->app->singleton(EthiopianHolidayCalendar::class);
        $this->app->singleton(QuestionBank::class);
        $this->app->singleton(PsychometricNormalizer::class);
        $this->app->singleton(ReasonCodeBuilder::class);
        $this->app->singleton(AuditLogger::class);
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Gate::policy(Business::class, BusinessPolicy::class);
        Gate::policy(PsychometricAssessment::class, PsychometricPolicy::class);
        Gate::policy(Valuation::class, ValuationPolicy::class);
        Gate::policy(LoanApplication::class, LoanApplicationPolicy::class);
        Gate::policy(ExogenousFactor::class, ExogenousFactorsPolicy::class);
        Gate::policy(FairnessAudit::class, FairnessAuditPolicy::class);
        Gate::policy(DriftMetric::class, DriftMetricsPolicy::class);
        Gate::policy(Consent::class, ConsentPolicy::class);
        Gate::policy(DataSubjectRequest::class, ErasurePolicy::class);
        Gate::policy(AuditLog::class, AuditLogPolicy::class);
    }
}
