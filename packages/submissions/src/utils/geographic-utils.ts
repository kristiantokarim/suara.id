/**
 * Geographic Utilities
 * 
 * Utilities for geographic calculations, administrative boundary
 * detection, and location-based analysis for submissions.
 */

import type { SubmissionLocation } from '../types';

/**
 * Geographic metrics for submissions
 */
export interface GeographicMetrics {
  administrativeLevel: string;
  urbanizationLevel: 'rural' | 'suburban' | 'urban' | 'metropolitan';
  populationDensity: 'low' | 'medium' | 'high' | 'very_high';
  distanceToCity: number; // km to nearest major city
  nearbySubmissionCount: number;
  clusterPotential: number; // 0-1 score for clustering potential
}

/**
 * Calculate comprehensive geographic metrics for a location
 * 
 * @param location - Submission location data
 * @returns Geographic metrics and analysis
 */
export async function calculateGeographicMetrics(
  location: SubmissionLocation
): Promise<GeographicMetrics> {
  const [latitude, longitude] = location.coordinates;
  
  // Determine administrative level
  const administrativeLevel = determineAdministrativeLevel(location);
  
  // Calculate urbanization level based on coordinates
  const urbanizationLevel = calculateUrbanizationLevel(latitude, longitude);
  
  // Estimate population density
  const populationDensity = estimatePopulationDensity(latitude, longitude);
  
  // Calculate distance to nearest major city
  const distanceToCity = calculateDistanceToNearestCity(latitude, longitude);
  
  // Mock nearby submission count (in production, query database)
  const nearbySubmissionCount = 0; // TODO: Implement
  
  // Calculate cluster potential
  const clusterPotential = calculateClusterPotential(
    location, 
    nearbySubmissionCount,
    urbanizationLevel
  );

  return {
    administrativeLevel,
    urbanizationLevel,
    populationDensity,
    distanceToCity,
    nearbySubmissionCount,
    clusterPotential
  };
}

/**
 * Determine administrative level completeness
 */
function determineAdministrativeLevel(location: SubmissionLocation): string {
  if (location.kelurahan && location.kecamatan && 
      location.kabupaten && location.provinsi) {
    return 'complete';
  } else if (location.kecamatan && location.kabupaten && location.provinsi) {
    return 'district';
  } else if (location.kabupaten && location.provinsi) {
    return 'regency';
  } else if (location.provinsi) {
    return 'province';
  }
  return 'incomplete';
}

/**
 * Calculate urbanization level based on coordinates
 */
function calculateUrbanizationLevel(
  latitude: number, 
  longitude: number
): 'rural' | 'suburban' | 'urban' | 'metropolitan' {
  // Major Indonesian metropolitan areas
  const metropolitanAreas = [
    { name: 'Jakarta', center: [-6.2088, 106.8456], radius: 25 },
    { name: 'Surabaya', center: [-7.2575, 112.7521], radius: 20 },
    { name: 'Bandung', center: [-6.9175, 107.6191], radius: 15 },
    { name: 'Medan', center: [3.5952, 98.6722], radius: 15 },
    { name: 'Semarang', center: [-6.9667, 110.4167], radius: 12 },
    { name: 'Makassar', center: [-5.1477, 119.4327], radius: 12 },
    { name: 'Palembang', center: [-2.9761, 104.7754], radius: 10 }
  ];
  
  // Check if in metropolitan area
  for (const metro of metropolitanAreas) {
    const distance = calculateDistance(
      latitude, longitude,
      metro.center[0], metro.center[1]
    );
    if (distance <= metro.radius) {
      return distance <= metro.radius * 0.5 ? 'metropolitan' : 'urban';
    }
  }
  
  // Provincial capitals and major cities
  const majorCities = [
    { center: [-0.7893, 113.9213], radius: 8 }, // Pontianak
    { center: [-3.3194, 114.5906], radius: 8 }, // Banjarmasin  
    { center: [1.4524, 124.8421], radius: 6 },  // Manado
    { center: [-8.6500, 115.2167], radius: 8 }, // Denpasar
    // Add more cities as needed
  ];
  
  for (const city of majorCities) {
    const distance = calculateDistance(
      latitude, longitude,
      city.center[0], city.center[1]
    );
    if (distance <= city.radius) {
      return distance <= city.radius * 0.6 ? 'urban' : 'suburban';
    }
  }
  
  return 'rural';
}

/**
 * Estimate population density based on location
 */
function estimatePopulationDensity(
  latitude: number, 
  longitude: number
): 'low' | 'medium' | 'high' | 'very_high' {
  // High density areas (Java, parts of Sumatra, Bali)
  const highDensityRegions = [
    // Java
    { bounds: [-8.8, -5.9, 105.0, 115.0] }, // [minLat, maxLat, minLng, maxLng]
    // Bali
    { bounds: [-8.9, -8.1, 114.4, 115.7] },
    // North Sumatra urban areas
    { bounds: [2.5, 4.5, 98.0, 99.5] }
  ];
  
  for (const region of highDensityRegions) {
    if (latitude >= region.bounds[0] && latitude <= region.bounds[1] &&
        longitude >= region.bounds[2] && longitude <= region.bounds[3]) {
      
      // Further refinement based on urbanization
      const urbanLevel = calculateUrbanizationLevel(latitude, longitude);
      if (urbanLevel === 'metropolitan') return 'very_high';
      if (urbanLevel === 'urban') return 'high';
      if (urbanLevel === 'suburban') return 'medium';
      return 'medium';
    }
  }
  
  // Medium density areas (Sumatra, Sulawesi coastal areas)
  const mediumDensityRegions = [
    { bounds: [-6.0, 6.0, 95.0, 106.0] }, // Sumatra
    { bounds: [-6.0, 2.0, 118.0, 125.0] }  // Sulawesi
  ];
  
  for (const region of mediumDensityRegions) {
    if (latitude >= region.bounds[0] && latitude <= region.bounds[1] &&
        longitude >= region.bounds[2] && longitude <= region.bounds[3]) {
      return 'medium';
    }
  }
  
  return 'low'; // Default for remote areas
}

/**
 * Calculate distance to nearest major city
 */
function calculateDistanceToNearestCity(
  latitude: number,
  longitude: number
): number {
  const majorCities = [
    [-6.2088, 106.8456], // Jakarta
    [-7.2575, 112.7521], // Surabaya
    [-6.9175, 107.6191], // Bandung
    [3.5952, 98.6722],   // Medan
    [-6.9667, 110.4167], // Semarang
    [-5.1477, 119.4327], // Makassar
    [-2.9761, 104.7754], // Palembang
    [-0.7893, 113.9213], // Pontianak
    [-3.3194, 114.5906], // Banjarmasin
    [1.4524, 124.8421],  // Manado
    [-8.6500, 115.2167]  // Denpasar
  ];
  
  let minDistance = Infinity;
  
  for (const [cityLat, cityLng] of majorCities) {
    const distance = calculateDistance(latitude, longitude, cityLat, cityLng);
    minDistance = Math.min(minDistance, distance);
  }
  
  return Math.round(minDistance);
}

/**
 * Calculate cluster potential score
 */
function calculateClusterPotential(
  location: SubmissionLocation,
  nearbySubmissionCount: number,
  urbanizationLevel: string
): number {
  let score = 0;
  
  // Base score from nearby submissions
  score += Math.min(0.5, nearbySubmissionCount / 10);
  
  // Urbanization bonus (higher potential in urban areas)
  const urbanBonus = {
    'metropolitan': 0.3,
    'urban': 0.2,
    'suburban': 0.1,
    'rural': 0.05
  };
  score += urbanBonus[urbanizationLevel as keyof typeof urbanBonus] || 0;
  
  // GPS accuracy bonus (better accuracy = higher cluster potential)
  if (location.accuracy <= 10) score += 0.15;
  else if (location.accuracy <= 50) score += 0.1;
  else if (location.accuracy <= 100) score += 0.05;
  
  // Administrative data completeness bonus
  if (location.kelurahan && location.kecamatan) score += 0.05;
  
  return Math.min(1, score);
}

/**
 * Calculate great circle distance between two points
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point  
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if point is within a bounding box
 * 
 * @param point - [latitude, longitude]
 * @param bounds - [minLat, maxLat, minLng, maxLng]
 * @returns True if point is within bounds
 */
export function isWithinBounds(
  point: [number, number],
  bounds: [number, number, number, number]
): boolean {
  const [lat, lng] = point;
  const [minLat, maxLat, minLng, maxLng] = bounds;
  
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Find submissions within radius of a center point
 * 
 * @param center - Center point [latitude, longitude]
 * @param radius - Radius in kilometers
 * @param submissions - Array of submissions with location data
 * @returns Submissions within the specified radius
 */
export function findSubmissionsWithinRadius<T extends { location: any }>(
  center: [number, number],
  radius: number,
  submissions: T[]
): T[] {
  const [centerLat, centerLng] = center;
  
  return submissions.filter(submission => {
    const location = submission.location as SubmissionLocation;
    if (!location.coordinates) return false;
    
    const [lat, lng] = location.coordinates;
    const distance = calculateDistance(centerLat, centerLng, lat, lng);
    
    return distance <= radius;
  });
}

/**
 * Calculate bounding box for a center point and radius
 * 
 * @param center - Center point [latitude, longitude]
 * @param radiusKm - Radius in kilometers
 * @returns Bounding box [minLat, maxLat, minLng, maxLng]
 */
export function calculateBoundingBox(
  center: [number, number],
  radiusKm: number
): [number, number, number, number] {
  const [lat, lng] = center;
  
  // Approximate degrees per kilometer
  const latDegPerKm = 1 / 111;
  const lngDegPerKm = 1 / (111 * Math.cos(toRadians(lat)));
  
  const latOffset = radiusKm * latDegPerKm;
  const lngOffset = radiusKm * lngDegPerKm;
  
  return [
    lat - latOffset, // minLat
    lat + latOffset, // maxLat
    lng - lngOffset, // minLng
    lng + lngOffset  // maxLng
  ];
}