import { NextRequest, NextResponse } from "next/server";
import { overrideCategory } from "@/lib/services/db/transactions";
import { isAppwriteConfigured } from "@/lib/appwrite";
import type { Category } from "@/lib/types";

const VALID_CATEGORIES: Category[] = [
  // Legacy
  "investment", "refund", "food", "transfer", "other",
  // Income — top level
  "salary", "freelance", "business_income", "investments", "gov_benefits",
  "refunds", "gifts", "other_income",
  // Income — subcategories
  "salary_regular", "salary_overtime", "salary_bonus", "salary_commission", "salary_tips",
  "freelance_contract", "freelance_consulting", "freelance_gig_platform", "freelance_royalties", "freelance_speaking",
  "business_income_product_sales", "business_income_service_revenue", "business_income_affiliate", "business_income_licensing", "business_income_rental",
  "investments_dividends", "investments_interest", "investments_capital_gains", "investments_crypto_gains", "investments_stock_options",
  "gov_social_security", "gov_unemployment", "gov_disability", "gov_veterans", "gov_child_support",
  "refunds_tax", "refunds_purchase", "refunds_insurance", "refunds_expense", "refunds_warranty",
  "gifts_cash", "gifts_inheritance", "gifts_prize", "gifts_crowdfunding", "gifts_gift_card",
  "other_income_cashback", "other_income_survey", "other_income_selling", "other_income_misc",
  // Expense — top level
  "housing", "transportation", "food_dining", "utilities", "healthcare", "personal_care",
  "entertainment", "shopping", "education", "family_childcare", "pets", "subscriptions",
  "travel", "insurance", "financial_fees", "taxes", "charity", "debt_payments",
  "business_expenses", "other_expenses",
  // Expense — subcategories
  "housing_rent_mortgage", "housing_hoa", "housing_property_tax", "housing_insurance", "housing_repairs", "housing_cleaning", "housing_pest_control", "housing_security",
  "transport_gas", "transport_car_payment", "transport_auto_insurance", "transport_parking_tolls", "transport_maintenance", "transport_public_transit", "transport_rideshare", "transport_bike_scooter", "transport_registration",
  "food_groceries", "food_restaurants", "food_fast_food", "food_coffee", "food_delivery", "food_alcohol", "food_meal_kits",
  "utilities_electricity", "utilities_water", "utilities_gas", "utilities_internet", "utilities_mobile", "utilities_landline", "utilities_trash",
  "health_doctor", "health_dentist", "health_vision", "health_prescriptions", "health_equipment", "health_insurance", "health_mental", "health_gym", "health_supplements",
  "personal_haircut", "personal_spa", "personal_skincare", "personal_grooming", "personal_clothing", "personal_laundry",
  "entertainment_streaming", "entertainment_movies_concerts", "entertainment_video_games", "entertainment_sports_rec", "entertainment_books", "entertainment_hobbies", "entertainment_nightlife", "entertainment_attractions",
  "shopping_electronics", "shopping_clothing", "shopping_home_goods", "shopping_sports_equipment", "shopping_toys_kids", "shopping_pet_supplies", "shopping_online_marketplace", "shopping_gifts_purchased",
  "education_tuition", "education_student_loan", "education_books_supplies", "education_online_courses", "education_tutoring", "education_childcare", "education_school_activities",
  "family_daycare", "family_baby_supplies", "family_kids_activities", "family_child_support_paid", "family_alimony_paid", "family_elder_care",
  "pets_food", "pets_vet", "pets_grooming", "pets_insurance", "pets_boarding", "pets_supplies",
  "subscriptions_software", "subscriptions_streaming_video", "subscriptions_streaming_music", "subscriptions_news_media", "subscriptions_gym_club", "subscriptions_professional", "subscriptions_apps", "subscriptions_box",
  "travel_flights", "travel_hotels", "travel_vacation_rental", "travel_car_rental", "travel_insurance", "travel_activities", "travel_cruises", "travel_docs",
  "insurance_life", "insurance_disability", "insurance_umbrella", "insurance_liability",
  "fees_bank", "fees_atm", "fees_overdraft", "fees_wire_transfer", "fees_investment", "fees_tax_prep", "fees_accounting",
  "taxes_federal", "taxes_state", "taxes_self_employment", "taxes_property", "taxes_sales", "taxes_quarterly",
  "charity_nonprofit", "charity_religious", "charity_fundraising", "charity_sponsorships",
  "debt_credit_card", "debt_personal_loan", "debt_student_loan", "debt_medical", "debt_bnpl", "debt_collections",
  "biz_office_supplies", "biz_software_tools", "biz_marketing", "biz_professional_services", "biz_travel", "biz_client_meals", "biz_equipment",
  "other_exp_legal", "other_exp_fines", "other_exp_cash", "other_exp_misc",
  // Transfer — top level
  "savings_investments", "account_transfers", "pay_person",
  // Transfer — subcategories
  "savings_emergency_fund", "savings_hysa", "savings_brokerage", "savings_crypto", "savings_retirement", "savings_cd",
  "transfer_checking_savings", "transfer_own_accounts", "transfer_joint", "transfer_escrow",
  "p2p_venmo_paypal_zelle", "p2p_rent_roommate", "p2p_split_bill", "p2p_loan_friend", "p2p_repayment",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const { transactionId } = await params;
    const body = await request.json();
    const { category } = body as { category?: string };

    if (!category || !VALID_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await overrideCategory(transactionId, category as Category);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to override category";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
