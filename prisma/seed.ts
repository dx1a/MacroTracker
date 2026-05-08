import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const foods = [
  // Proteins
  { name: "Chicken Breast", brand: "Generic", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: "g" },
  { name: "Chicken Thigh (boneless)", brand: "Generic", calories: 209, protein: 26, carbs: 0, fat: 11, servingSize: 100, servingUnit: "g" },
  { name: "Ground Beef (93% lean)", brand: "Generic", calories: 152, protein: 22, carbs: 0, fat: 7, servingSize: 100, servingUnit: "g" },
  { name: "Salmon Fillet", brand: "Generic", calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 100, servingUnit: "g" },
  { name: "Tilapia", brand: "Generic", calories: 96, protein: 20, carbs: 0, fat: 1.7, servingSize: 100, servingUnit: "g" },
  { name: "Tuna (canned in water)", brand: "Generic", calories: 90, protein: 20, carbs: 0, fat: 0.8, servingSize: 100, servingUnit: "g" },
  { name: "Shrimp", brand: "Generic", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { name: "Eggs (large)", brand: "Generic", calories: 72, protein: 6, carbs: 0.4, fat: 5, servingSize: 50, servingUnit: "g" },
  { name: "Egg Whites", brand: "Generic", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, servingSize: 100, servingUnit: "g" },
  { name: "Greek Yogurt (non-fat)", brand: "Chobani", calories: 59, protein: 10, carbs: 3.5, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { name: "Cottage Cheese (low-fat)", brand: "Generic", calories: 72, protein: 12, carbs: 2.7, fat: 1, servingSize: 100, servingUnit: "g" },
  { name: "Whey Protein Powder", brand: "Generic", calories: 120, protein: 24, carbs: 3, fat: 2, servingSize: 30, servingUnit: "g" },
  { name: "Turkey Breast", brand: "Generic", calories: 157, protein: 30, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: "g" },
  { name: "Beef Steak (sirloin)", brand: "Generic", calories: 207, protein: 26, carbs: 0, fat: 11, servingSize: 100, servingUnit: "g" },
  { name: "Pork Tenderloin", brand: "Generic", calories: 143, protein: 26, carbs: 0, fat: 3.5, servingSize: 100, servingUnit: "g" },

  // Carbs & Grains
  { name: "White Rice (cooked)", brand: "Generic", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { name: "Brown Rice (cooked)", brand: "Generic", calories: 123, protein: 2.6, carbs: 26, fat: 1, servingSize: 100, servingUnit: "g" },
  { name: "Oats (dry)", brand: "Quaker", calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, servingSize: 100, servingUnit: "g" },
  { name: "Whole Wheat Bread", brand: "Generic", calories: 247, protein: 13, carbs: 43, fat: 3.4, fiber: 7, servingSize: 100, servingUnit: "g" },
  { name: "White Bread", brand: "Generic", calories: 265, protein: 9, carbs: 49, fat: 3.2, servingSize: 100, servingUnit: "g" },
  { name: "Sweet Potato (cooked)", brand: "Generic", calories: 90, protein: 2, carbs: 21, fat: 0.1, fiber: 3.3, servingSize: 100, servingUnit: "g" },
  { name: "White Potato (baked)", brand: "Generic", calories: 93, protein: 2.5, carbs: 21, fat: 0.1, fiber: 2.2, servingSize: 100, servingUnit: "g" },
  { name: "Pasta (cooked)", brand: "Generic", calories: 158, protein: 5.8, carbs: 31, fat: 0.9, servingSize: 100, servingUnit: "g" },
  { name: "Quinoa (cooked)", brand: "Generic", calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8, servingSize: 100, servingUnit: "g" },
  { name: "Banana", brand: "Generic", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, servingSize: 100, servingUnit: "g" },
  { name: "Apple", brand: "Generic", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, servingSize: 100, servingUnit: "g" },
  { name: "Blueberries", brand: "Generic", calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, servingSize: 100, servingUnit: "g" },
  { name: "Strawberries", brand: "Generic", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, servingSize: 100, servingUnit: "g" },
  { name: "Orange", brand: "Generic", calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, servingSize: 100, servingUnit: "g" },

  // Fats
  { name: "Avocado", brand: "Generic", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, servingSize: 100, servingUnit: "g" },
  { name: "Olive Oil", brand: "Generic", calories: 884, protein: 0, carbs: 0, fat: 100, servingSize: 14, servingUnit: "g" },
  { name: "Almonds", brand: "Generic", calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, servingSize: 28, servingUnit: "g" },
  { name: "Peanut Butter", brand: "Jif", calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, servingSize: 32, servingUnit: "g" },
  { name: "Walnuts", brand: "Generic", calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, servingSize: 28, servingUnit: "g" },
  { name: "Cheddar Cheese", brand: "Generic", calories: 402, protein: 25, carbs: 1.3, fat: 33, servingSize: 28, servingUnit: "g" },
  { name: "Whole Milk", brand: "Generic", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, servingSize: 100, servingUnit: "ml" },
  { name: "Skim Milk", brand: "Generic", calories: 34, protein: 3.4, carbs: 5, fat: 0.1, servingSize: 100, servingUnit: "ml" },

  // Vegetables
  { name: "Broccoli (cooked)", brand: "Generic", calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, fiber: 3.3, servingSize: 100, servingUnit: "g" },
  { name: "Spinach (raw)", brand: "Generic", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, servingSize: 100, servingUnit: "g" },
  { name: "Kale (raw)", brand: "Generic", calories: 49, protein: 4.3, carbs: 9, fat: 0.9, fiber: 3.6, servingSize: 100, servingUnit: "g" },
  { name: "Bell Pepper (red)", brand: "Generic", calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, servingSize: 100, servingUnit: "g" },
  { name: "Zucchini", brand: "Generic", calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, servingSize: 100, servingUnit: "g" },
  { name: "Asparagus", brand: "Generic", calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1, servingSize: 100, servingUnit: "g" },

  // Common meals / fast food
  { name: "Chipotle Chicken Bowl (est.)", brand: "Chipotle", calories: 665, protein: 47, carbs: 68, fat: 20, servingSize: 350, servingUnit: "g" },
  { name: "McDonald's McChicken", brand: "McDonald's", calories: 400, protein: 14, carbs: 39, fat: 21, sodium: 690, servingSize: 153, servingUnit: "g" },
  { name: "Subway 6-inch Turkey", brand: "Subway", calories: 280, protein: 18, carbs: 45, fat: 4.5, sodium: 730, servingSize: 220, servingUnit: "g" },
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const food of foods) {
    await prisma.food.upsert({
      where: {
        // Use a stable identifier
        id: Buffer.from(food.name + (food.brand ?? "")).toString("base64url").slice(0, 25),
      },
      update: food,
      create: {
        id: Buffer.from(food.name + (food.brand ?? "")).toString("base64url").slice(0, 25),
        ...food,
        isCustom: false,
      },
    });
  }

  console.log(`✅ Seeded ${foods.length} foods`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
