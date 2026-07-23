/*
  039_wxl_compost_trigger_permissions.sql
  Keeps the route gate callable only as a table trigger.
*/

revoke execute on function command.require_food_harvest_compost_dropoff() from public, anon, authenticated;
