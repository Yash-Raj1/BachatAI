import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

supabase = create_client(
    os.getenv('SUPABASE_URL'), 
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

users = [
    {'id': '7eda375f-c530-49a8-955d-641ed7e7a5a5', 'name': 'Rohit Singh'},
    {'id': '87e70e98-68be-4f73-876c-aea7531896f8', 'name': 'Ayush Singh'},
    {'id': 'a6e9f6ac-e2b5-4715-b89a-eb61a7b088bd', 'name': 'Aditya Yadav'},
    {'id': 'ca8d5063-b097-4424-8954-c12cb2feba16', 'name': 'Yash Raj'}
]

badges_to_give = [
    {'badge_type': 'first_upload', 'badge_name': 'First Upload'},
    {'badge_type': 'saver_rookie', 'badge_name': 'Saver Rookie'},
    {'badge_type': 'budget_champion', 'badge_name': '60:40 Champion'}
]

print("Starting badge population...")

for user in users:
    print(f"\nProcessing '{user['name']}' ({user['id']})...")
    for badge in badges_to_give:
        existing = supabase.table('badges').select('*').eq('user_id', user['id']).eq('badge_type', badge['badge_type']).execute()
        
        if not existing.data:
            supabase.table('badges').insert({
                'user_id': user['id'],
                'badge_type': badge['badge_type'],
                'badge_name': badge['badge_name']
            }).execute()
            print(f" -> Inserted {badge['badge_name']}")
        else:
            print(f" -> Already had {badge['badge_name']}")

print("\nDone seeding badges!")
