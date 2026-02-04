// Gemini API Service for Timetable Digitization
// Uses 4 API keys with random selection per request

const GEMINI_API_KEYS = [
    'AIzaSyAefvK_hUGjMZYuoktgsfB-8-i9lLdrFaQ',
    'AIzaSyDqvaupnyJCiegbiAHYVGiIwHDNZSa0HNo',
    'AIzaSyCI9RnnuBNkIcZGrRO7Q7SW7MkiWOPSgzE',
    'AIzaSyCUS9pfYRzv-l9mBJ6gZUwL28YOrj4UPkU'
];

const getRandomApiKey = () => {
    const index = Math.floor(Math.random() * GEMINI_API_KEYS.length);
    console.log(`Using Gemini API key index: ${index}`);
    return GEMINI_API_KEYS[index];
};

const TIMETABLE_PROMPT = `You are analyzing a university/college timetable image. Extract ALL the scheduled classes and return them in a structured JSON format.

For each class entry, extract:
- day: The day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- time: Start time in 24-hour format (HH:MM), e.g., "09:00"
- end: End time in 24-hour format (HH:MM), e.g., "09:50"
- title: Course code and name (e.g., "MATH F102" or "CS F111")
- type: Class type and section (e.g., "L1", "L2", "T8", "P4" for Lecture/Tutorial/Practical)
- location: Room/location (e.g., "F104", "G208", "A222")

IMPORTANT RULES:
1. Parse the ENTIRE timetable - don't miss any classes
2. If a class spans multiple hours, set the correct end time
3. Use 24-hour time format
4. If location is unclear, use empty string ""
5. Return ONLY valid JSON, no markdown, no explanation

Return the data as a JSON object with days as keys:
{
  "Monday": [
    { "time": "09:00", "end": "09:50", "title": "MATH F102", "type": "L3", "location": "F104" }
  ],
  "Tuesday": [...],
  "Wednesday": [...],
  "Thursday": [...],
  "Friday": [...],
  "Saturday": [],
  "Sunday": []
}`;

export const digitizeTimetable = async (imageBase64, mimeType = 'image/jpeg') => {
    const apiKey = getRandomApiKey();
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: TIMETABLE_PROMPT
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 8192
        }
    };

    try {
        console.log('Sending request to Gemini API...');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Gemini API response:', data);

        // Extract text from response
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            throw new Error('No text content in Gemini response');
        }

        // Parse JSON from response (handle potential markdown code blocks)
        let jsonStr = textContent;

        // Remove markdown code blocks if present
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
        }

        jsonStr = jsonStr.trim();

        const schedule = JSON.parse(jsonStr);

        // Validate the structure
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const validatedSchedule = {};

        for (const day of validDays) {
            if (Array.isArray(schedule[day])) {
                validatedSchedule[day] = schedule[day].map(item => ({
                    time: item.time || '09:00',
                    end: item.end || '10:00',
                    title: item.title || 'Unknown Class',
                    type: item.type || '',
                    location: item.location || ''
                }));
            } else {
                validatedSchedule[day] = [];
            }
        }

        console.log('Parsed schedule:', validatedSchedule);
        return validatedSchedule;

    } catch (error) {
        console.error('Error digitizing timetable:', error);
        throw error;
    }
};

export default { digitizeTimetable };
