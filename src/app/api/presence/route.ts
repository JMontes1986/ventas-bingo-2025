
import { NextResponse } from 'next/server';

type UserState = 'consultando' | 'pagando' | 'completado';

interface SessionData {
    lastSeen: number;
    state: UserState;
}

// This is a simple in-memory store. For a production environment with multiple
// server instances, a shared store like Redis or a database would be necessary.
const activeSessions = new Map<string, SessionData>();
const SESSION_TIMEOUT = 30000; // 30 seconds

// Function to clean up expired sessions
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (now - sessionData.lastSeen > SESSION_TIMEOUT) {
            activeSessions.delete(sessionId);
        }
    }
}

// GET request handler to return the count and states of active sessions
export async function GET() {
    cleanupExpiredSessions();
    
    const states = {
        consultando: 0,
        pagando: 0,
        completado: 0,
    };

    for (const sessionData of activeSessions.values()) {
        states[sessionData.state]++;
    }

    return NextResponse.json({ 
        total: activeSessions.size,
        states: states,
    });
}

// POST request handler to update a session's presence
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, state } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }
        
        cleanupExpiredSessions();

        if (state === 'inactive') {
            activeSessions.delete(sessionId);
        } else if (['consultando', 'pagando', 'completado'].includes(state)) {
            activeSessions.set(sessionId, { lastSeen: Date.now(), state });
        }
        
        return NextResponse.json({ status: 'ok', total: activeSessions.size });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
