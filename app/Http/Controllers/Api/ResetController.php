<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ResetController extends Controller
{
    private function truncateTables(array $tables): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            DB::table($table)->truncate();
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function resetAll(): JsonResponse
    {
        try {
            $this->truncateTables([
                'assets', 'licenses', 'license_seats',
                'accessories', 'components', 'consumables',
            ]);
            return response()->json(['status' => 'success', 'message' => 'Toutes les données ont été réinitialisées.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    public function resetAssets(): JsonResponse
    {
        try {
            $this->truncateTables(['assets']);
            return response()->json(['status' => 'success', 'message' => 'Assets réinitialisés.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    public function resetLicenses(): JsonResponse
    {
        try {
            $this->truncateTables(['licenses', 'license_seats']);
            return response()->json(['status' => 'success', 'message' => 'Licenses réinitialisées.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    public function resetAccessories(): JsonResponse
    {
        try {
            $this->truncateTables(['accessories']);
            return response()->json(['status' => 'success', 'message' => 'Accessories réinitialisés.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    public function resetComponents(): JsonResponse
    {
        try {
            $this->truncateTables(['components']);
            return response()->json(['status' => 'success', 'message' => 'Components réinitialisés.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }

    public function resetConsumables(): JsonResponse
    {
        try {
            $this->truncateTables(['consumables']);
            return response()->json(['status' => 'success', 'message' => 'Consumables réinitialisés.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Erreur : ' . $e->getMessage()], 500);
        }
    }
}