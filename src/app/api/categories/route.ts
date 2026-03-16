import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const categoriesPath = path.join(process.cwd(), 'src/data/categories.json');

function getCategories() {
  if (!fs.existsSync(categoriesPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
}

function saveCategories(categories: any[]) {
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
}

export async function GET() {
  return NextResponse.json(getCategories());
}

export async function POST(req: Request) {
  try {
    const category = await req.json();
    const categories = getCategories();
    
    // Check if category already exists
    if (categories.find((c: any) => c.id === category.id)) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    categories.push(category);
    saveCategories(categories);
    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, label, amazonSlug } = await req.json();
    let categories = getCategories();
    const index = categories.findIndex((c: any) => c.id === id);
    if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    if (label !== undefined) categories[index].label = label;
    if (amazonSlug !== undefined) categories[index].amazonSlug = amazonSlug;
    
    saveCategories(categories);
    return NextResponse.json(categories[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { categories } = await req.json();
    if (!Array.isArray(categories)) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    
    saveCategories(categories);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    let categories = getCategories();
    categories = categories.filter((c: any) => c.id !== id);
    saveCategories(categories);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
