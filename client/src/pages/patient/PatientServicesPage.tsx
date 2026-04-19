import { Box, Card, CardContent, Typography } from "@mui/material";

const OFFERINGS: { title: string; description: string }[] = [
  {
    title: "Cleaning",
    description: "Professional scaling and polishing to remove plaque and maintain oral hygiene.",
  },
  {
    title: "Oral whitening",
    description: "Brighten your smile with safe, effective in-office whitening treatments.",
  },
  {
    title: "Tooth extraction",
    description: "Comfortable removal of damaged or problematic teeth when preservation is not possible.",
  },
  {
    title: "Jacket crowns",
    description: "Custom crowns to restore shape, strength, and appearance of damaged teeth.",
  },
  {
    title: "Dentures",
    description: "Removable full or partial dentures to replace missing teeth and support chewing.",
  },
  {
    title: "Fluoride treatment",
    description: "Protective fluoride application to strengthen enamel and reduce decay risk.",
  },
];

export function PatientServicesPage() {
  return (
    <Box sx={{ py: 1 }}>
      <Typography
        variant="h4"
        align="center"
        sx={{ fontWeight: 800, color: "text.primary", mb: 4 }}
      >
        Services We Offer
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2.5,
        }}
      >
        {OFFERINGS.map((item) => (
          <Card
            key={item.title}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main", mb: 1 }}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
