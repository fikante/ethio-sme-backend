<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AuditLog::query()->with('actor:id,name,email');

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.$request->string('action')->toString().'%');
        }

        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->string('entity_type')->toString());
        }

        if ($request->filled('actor')) {
            $query->whereHas('actor', function ($q) use ($request): void {
                $q->where('name', 'like', '%'.$request->string('actor')->toString().'%')
                  ->orWhere('email', 'like', '%'.$request->string('actor')->toString().'%');
            });
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->string('date_from')->toString().' 00:00:00');
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->string('date_to')->toString().' 23:59:59');
        }

        $logs = $query->orderByDesc('created_at')->paginate(50)->withQueryString();

        // Distinct event types for filter dropdown
        $eventTypes = AuditLog::query()
            ->distinct('action')
            ->pluck('action')
            ->sort()
            ->values()
            ->toArray();

        return Inertia::render('Admin/AuditLogs', [
            'logs'       => $logs,
            'eventTypes' => $eventTypes,
            'filters'    => $request->only(['action', 'entity_type', 'actor', 'date_from', 'date_to']),
        ]);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = AuditLog::query()->with('actor:id,name,email');

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.$request->string('action')->toString().'%');
        }
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->string('entity_type')->toString());
        }
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->string('date_from')->toString().' 00:00:00');
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->string('date_to')->toString().' 23:59:59');
        }

        $logs = $query->orderByDesc('created_at')->limit(10000)->get();

        $filename = 'audit_logs_'.now()->format('Y-m-d').'.csv';

        return ResponseFacade::streamDownload(function () use ($logs): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, ['Timestamp', 'Actor', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->created_at?->toDateTimeString() ?? '',
                    $log->actor?->name ?? 'System',
                    $log->actor?->email ?? '',
                    $log->action,
                    $log->entity_type ?? '',
                    $log->entity_id ?? '',
                    $log->ip_address ?? '',
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
