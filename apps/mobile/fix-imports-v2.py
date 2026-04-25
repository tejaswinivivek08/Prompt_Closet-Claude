#!/usr/bin/env python3
"""Fix @/ imports to correct relative paths.

src/lib/supabase    → from src/screens/wardrobe/X.tsx: ../../../lib/supabase (depth=3)
src/lib/supabase    → from src/screens/onboarding/X.tsx: ../../lib/supabase (depth=2)
src/lib/supabase    → from src/contexts/X.tsx: ../lib/supabase (depth=1)
src/services/embed  → from src/screens/wardrobe/X.tsx: ../../../services/embeddingService
"""
import os
import re

src_dir = 'src'
root = os.path.abspath(src_dir)

for dirpath, dirnames, filenames in os.walk(src_dir):
    dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != 'node_modules']

    for filename in filenames:
        if not filename.endswith('.ts') and not filename.endswith('.tsx'):
            continue

        filepath = os.path.join(dirpath, filename)
        rel_dir = os.path.relpath(os.path.dirname(filepath), root)

        # depth = number of path segments below src/
        # src/ → depth 0
        # src/screens/ → depth 1
        # src/screens/wardrobe/ → depth 2
        depth = len(rel_dir.split(os.sep)) if rel_dir != '.' else 0
        prefix = '../' * (depth + 1)  # +1 because lib/ is a sibling of screens/, not parent

        with open(filepath, 'r') as f:
            content = f.read()

        original = content

        # Replace @/lib/ imports
        content = re.sub(r'from "@/lib/', f'from "{prefix}lib/', content)
        # Replace @/types imports
        content = re.sub(r'from "@/types"', f'from "{prefix}types"', content)
        # Replace @/contexts imports
        content = re.sub(r'from "@/contexts/', f'from "{prefix}contexts/', content)
        # Replace @/screens imports
        content = re.sub(r'from "@/screens/', f'from "{prefix}screens/', content)
        # Replace @/navigation imports
        content = re.sub(r'from "@/navigation/', f'from "{prefix}navigation/', content)
        # Replace @/components imports
        content = re.sub(r'from "@/components/', f'from "{prefix}components/', content)
        # Replace @/services imports
        content = re.sub(r'from "@/services/', f'from "{prefix}services/', content)

        if content != original:
            print(f'Fixed: {filepath} (depth={depth}, prefix={prefix})')
            with open(filepath, 'w') as f:
                f.write(content)

print('Done')
