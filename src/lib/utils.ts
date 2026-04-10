import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDuration(startTime: Date | string, endTime: Date | string): string {
	const start = new Date(startTime);
	const end = new Date(endTime);
	const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
	const hrs = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hrs === 0) return `${mins}m`;
	if (mins === 0) return `${hrs}h`;
	return `${hrs}h ${mins}m`;
}

export function formatDurationHours(startTime: Date | string, endTime: Date | string): number {
	const start = new Date(startTime);
	const end = new Date(endTime);
	return (end.getTime() - start.getTime()) / 3600000;
}

export function formatTime(dt: Date | string): string {
	return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(dt: Date | string): string {
	return new Date(dt).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
}

export function normalizeEventTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.trim();
}
